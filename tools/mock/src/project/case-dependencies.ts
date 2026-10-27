import type { Context } from "hono"

import { detail, internalError, pathInteger, readBody, type FieldError } from "../pydantic.ts"
import type { PyValue } from "../python.ts"
import { requireAuthUser, type AuthUser } from "./authentication.ts"
import { canReach, typesFor, type Person } from "./case-access.ts"
import type { CaseRecord, CaseStore } from "./case-store.ts"
import type { ParticipantsList } from "./participants-list.ts"
import type { ProjectDependencies } from "./participants.ts"

/**
 * What FastAPI solves before a cases route runs, as `case.py` declares it: the body, the token,
 * the check that the caller has some case type, and the case the path names. Every dependency
 * runs before the route's own parameters are validated, so a refusal here comes before any 422
 * for a query or a body.
 */

/**
 * What the cases routes run against.
 */
export interface Service {
  readonly now: () => number
  readonly participantsList: ParticipantsList
  readonly store: CaseStore
}

/**
 * A route, given a caller who has some case type and the body FastAPI decoded.
 */
export type Handler = (context: Context, caller: Person, body: PyValue) => Response

/**
 * A route as Hono serves it.
 */
export type Route = (context: Context) => Promise<Response>

/**
 * Where the service fails past its own checks, which Starlette answers with a bare 500.
 */
class ServiceFailure extends Error {}

const int64 = 2n ** 63n

/**
 * Fails the request where the database would refuse a value, because the service hands values to
 * it as they arrive – an integer outside a BIGINT, or text with a NUL in it.
 * @param values The values, or lists of them, in the order the query takes them.
 */
export function storable(...values: readonly unknown[]): void {
  for (const value of values.flat()) {
    const isOutOfRange = typeof value === "bigint" && (value < -int64 || value >= int64)
    if (isOutOfRange || (typeof value === "string" && value.includes("\0"))) {
      throw new ServiceFailure("refused by the database")
    }
  }
}

// `AuthUser.user_id`, which is Python's `int(member_no)` and fails the request when the token's
// member number is not a number.
function userId(user: AuthUser): bigint {
  const digits = /^[+-]?\d+(?:_\d+)*$/u.exec(user.memberNo.trim())?.[0]
  if (digits === undefined) {
    throw new ServiceFailure("not a member number")
  }
  return BigInt(digits.replaceAll("_", ""))
}

/**
 * A route that takes a multipart form, given a caller who has some case type and the form
 * Starlette parsed – empty when the request was not a form.
 */
export type FormHandler = (context: Context, caller: Person, form: FormData) => Promise<Response>

// The token and the check every route shares, that the caller's roles give them some case type,
// then the route. A request the service would fail past its checks answers 500.
async function admitted(
  dependencies: ProjectDependencies,
  context: Context,
  handle: (caller: Person) => Promise<Response> | Response,
): Promise<Response> {
  const user = requireAuthUser(context, dependencies.key, dependencies.now())
  if (user instanceof Response) {
    return user
  }
  const caller: Person = { roles: user.roles, userId: () => userId(user) }
  if (typesFor(caller).length === 0) {
    return detail(context, "No access to cases", 403)
  }
  try {
    return await handle(caller)
  } catch (error) {
    if (error instanceof ServiceFailure) {
      return internalError(context)
    }
    throw error
  }
}

/**
 * Wraps a route in what FastAPI runs before it, in its order: the body, the token, and the check
 * every route shares, that the caller's roles give them some case type. A request the service
 * would fail past its checks answers 500.
 * @param dependencies The auth service's key and the clock.
 * @param hasBody Whether the route takes a body, which is decoded before the token is read.
 * @param handle The route to wrap.
 * @returns The route, ready to be served.
 */
export function guarded(
  dependencies: ProjectDependencies,
  hasBody: boolean,
  handle: Handler,
): Route {
  return async (context: Context): Promise<Response> => {
    const body = hasBody ? await readBody(context) : undefined
    if (body instanceof Response) {
      return body
    }
    return admitted(dependencies, context, (caller) => handle(context, caller, body))
  }
}

// Starlette parses a request as a form only when its content type names one, and reads anything
// else as an empty form, which leaves a required field missing rather than refusing the request.
const formTypes = /^(?:multipart\/form-data|application\/x-www-form-urlencoded)\s*(?:;|$)/iu

/**
 * Wraps a route that takes a multipart form, as `guarded` wraps one that takes JSON. The form is
 * parsed before the token is read, and a form that does not parse answers 400.
 * @param dependencies The auth service's key and the clock.
 * @param handle The route to wrap.
 * @returns The route, ready to be served.
 */
export function guardedForm(dependencies: ProjectDependencies, handle: FormHandler): Route {
  return async (context: Context): Promise<Response> => {
    let form = new FormData()
    if (formTypes.test(context.req.header("Content-Type")?.trim() ?? "")) {
      try {
        form = await context.req.formData()
      } catch {
        return detail(context, "There was an error parsing the body", 400)
      }
    }
    return admitted(dependencies, context, async (caller) => handle(context, caller, form))
  }
}

/**
 * The case a route acts on, and the refusals collected on the way to it.
 */
export interface Solved {
  /**
   * The refusals so far, which the route adds its own parameters' to and sends together.
   */
  readonly errors: FieldError[]
  /**
   * Undefined when the path's case id was refused, because the case is then never looked up.
   */
  readonly record: CaseRecord | undefined
}

/**
 * Solves `_case`, or `_open_case` when the case must be open. A case the caller does not reach
 * answers 404, the same as one that does not exist. A path that is not an id skips the lookup,
 * leaving its refusal to be sent with the route's. The route's own `case_id` is declared beside
 * the dependency's, so the route adds its refusal again, and FastAPI sends both.
 * @param service The store the case is looked up in.
 * @param context The request, whose path names the case.
 * @param caller The caller, who must reach the case.
 * @param requiresOpen Whether a closed case answers 409.
 * @returns The case and the refusals so far, or the answer to send instead.
 */
export function solveCase(
  service: Service,
  context: Context,
  caller: Person,
  requiresOpen: boolean,
): Response | Solved {
  const errors: FieldError[] = []
  const caseId = pathInteger(context, "caseId", "case_id", errors)
  if (errors.length > 0) {
    return { errors, record: undefined }
  }
  storable(caseId)
  const record = service.store.findCase(caseId)
  if (record === undefined || !canReach(caller, record)) {
    return detail(context, "Case not found", 404)
  }
  if (requiresOpen && record.closed) {
    return detail(context, "Case is closed", 409)
  }
  return { errors, record }
}
