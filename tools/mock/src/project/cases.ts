import { Hono, type Context } from "hono"

import { notFound } from "../fastapi.ts"
import {
  answer,
  bodyField,
  boundedInteger,
  detail,
  internalError,
  invalid,
  isTrue,
  listOf,
  modelOf,
  pathInteger,
  queryField,
  readBody,
  toDatetime,
  toInteger,
  toNullableInteger,
  toText,
  type FieldError,
  type Validator,
} from "../pydantic.ts"
import type { PyValue } from "../python.ts"
import { requireAuthUser, type AuthUser } from "./authentication.ts"
import {
  caseJson,
  newestFirst,
  noteJson,
  seededStore,
  type CaseRecord,
  type CaseStore,
  type NoteRecord,
} from "./case-store.ts"
import type { ProjectDependencies } from "./participants.ts"

/**
 * The cases service, as `case.py` runs it over its database: cases about a person, each with
 * its notes, opened, closed, and reopened by whoever the token names. Any caller with a project
 * role may do all of it, because the service checks nothing beyond the token.
 */

// In declaration order, which is the order `/cases/types` lists them in.
const caseTypes = ["hälsa", "admin", "avdelning"]

const secrecy = boundedInteger(1, 5)
const integers = listOf(toInteger)
const texts = listOf(toText)

// Where the service fails past its own checks, which Starlette answers with a bare 500.
class ServiceFailure extends Error {}

const int64 = 2n ** 63n

// The service hands these to the database as they arrive, so an integer outside a BIGINT or text
// with a NUL in it fails the query rather than being refused as invalid.
function storable(...values: readonly unknown[]): void {
  for (const value of values.flat()) {
    const isOutOfRange = typeof value === "bigint" && (value < -int64 || value >= int64)
    if (isOutOfRange || (typeof value === "string" && value.includes("\0"))) {
      throw new ServiceFailure("refused by the database")
    }
  }
}

// `AuthUser.user_id`, which is Python's `int(member_no)` and fails the request when the token's
// member number is not a number. Only the routes that record who acted ask for it.
function userId(user: AuthUser): bigint {
  const digits = /^[+-]?\d+(?:_\d+)*$/u.exec(user.memberNo.trim())?.[0]
  if (digits === undefined) {
    throw new ServiceFailure("not a member number")
  }
  return BigInt(digits.replaceAll("_", ""))
}

interface Service {
  readonly now: () => number
  readonly store: CaseStore
}

function createCase(
  { now, store }: Service,
  context: Context,
  user: AuthUser,
  body: PyValue,
): Response {
  const errors: FieldError[] = []
  const fields = modelOf(body, errors)
  if (fields === undefined) {
    return invalid(context, errors)
  }
  const secrecyLevel = Number(bodyField(fields, "secrecy_level", errors, secrecy, true))
  const title = bodyField(fields, "title", errors, toText, true) ?? ""
  const type = bodyField(fields, "type", errors, toText, true) ?? ""
  const aboutPersonId = bodyField(fields, "about_person_id", errors, toNullableInteger, false)
  const troop = bodyField(fields, "troop", errors, toText, true) ?? ""
  const extraAccess = bodyField(fields, "extra_access", errors, integers, false) ?? []
  const tags = bodyField(fields, "tags", errors, texts, false) ?? []
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  if (!caseTypes.includes(type)) {
    return detail(context, `Invalid case type: ${type}`, 422)
  }
  const creatorId = userId(user)
  storable(creatorId, title, type, aboutPersonId, troop, extraAccess, tags)
  const created = {
    aboutPersonId,
    assignedToId: undefined,
    createdAt: now(),
    creatorId,
  }
  const record = store.addCase({
    ...created,
    extraAccess,
    secrecyLevel,
    tags,
    title,
    troop,
    type,
  })
  return answer(context, caseJson(record), 201)
}

function listCases({ store }: Service, context: Context): Response {
  const errors: FieldError[] = []
  const aboutPersonId = queryField(context, "about_person_id", errors, toInteger)
  const troop = queryField(context, "troop", errors, toText)
  const type = queryField(context, "type", errors, toText)
  const tag = queryField(context, "tag", errors, toText)
  const notOlderThan = queryField(context, "not_older_than", errors, toDatetime)
  const isClosedIncluded = queryField(context, "include_closed", errors, isTrue) ?? false
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  storable(aboutPersonId, troop, type, tag)
  const listed = store.cases.filter(
    (record) =>
      (aboutPersonId === undefined || record.aboutPersonId === aboutPersonId) &&
      (troop === undefined || record.troop === troop) &&
      (type === undefined || record.type === type) &&
      (notOlderThan === undefined || record.createdAt * 1000 >= notOlderThan) &&
      (isClosedIncluded || !record.closed) &&
      (tag === undefined || record.tags.includes(tag)),
  )
  return answer(
    context,
    listed.toSorted(newestFirst).map((record) => caseJson(record)),
  )
}

function setClosed(
  { now, store }: Service,
  context: Context,
  user: AuthUser,
  isClosing: boolean,
): Response {
  const errors: FieldError[] = []
  const caseId = pathInteger(context, "caseId", "case_id", errors)
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  // Closing records who closed it, so it asks for the caller's number before it looks.
  const closer = isClosing ? userId(user) : undefined
  storable(caseId, closer)
  const record = store.findCase(caseId)
  if (record === undefined) {
    return detail(context, "Case not found", 404)
  }
  if (record.closed === isClosing) {
    return detail(context, isClosing ? "Case is already closed" : "Case is not closed", 409)
  }
  record.closed = isClosing
  record.closedAt = isClosing ? now() : undefined
  record.closedById = closer
  return answer(context, caseJson(record))
}

function createNote(
  { now, store }: Service,
  context: Context,
  user: AuthUser,
  body: PyValue,
): Response {
  const errors: FieldError[] = []
  const caseId = pathInteger(context, "caseId", "case_id", errors)
  const fields = modelOf(body, errors)
  if (fields === undefined) {
    return invalid(context, errors)
  }
  const secrecyLevel = Number(bodyField(fields, "secrecy_level", errors, secrecy, true))
  const title = bodyField(fields, "title", errors, toText, true) ?? ""
  const note = bodyField(fields, "note", errors, toText, true) ?? ""
  const extraAccess = bodyField(fields, "extra_access", errors, integers, false) ?? []
  const tags = bodyField(fields, "tags", errors, texts, false) ?? []
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  storable(caseId)
  const record = store.findCase(caseId)
  if (record === undefined) {
    return detail(context, "Case not found", 404)
  }
  if (record.closed) {
    return detail(context, "Case is closed", 409)
  }
  if (secrecyLevel < record.secrecyLevel) {
    const text = "Note secrecy level must be equal or higher than the case's secrecy level"
    return detail(context, text, 422)
  }
  const creatorId = userId(user)
  storable(creatorId, title, note, extraAccess, tags)
  const written = {
    createdAt: now(),
    creatorId,
    extraAccess,
    note,
    secrecyLevel,
    tags,
    title,
  }
  return answer(context, noteJson(store.addNote(record, written)), 201)
}

function listNotes({ store }: Service, context: Context, user: AuthUser): Response {
  const errors: FieldError[] = []
  const caseId = pathInteger(context, "caseId", "case_id", errors)
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  storable(caseId)
  if (store.findCase(caseId) === undefined) {
    return detail(context, "Case not found", 404)
  }
  const notes = store.notes.filter((note) => BigInt(note.caseId) === caseId)
  // The service logs every read under the reader's number once it has the notes. The log is not
  // kept here, but the number is still asked for.
  userId(user)
  return answer(
    context,
    notes.toSorted(newestFirst).map((note) => noteJson(note)),
  )
}

type Apply<T> = (record: CaseRecord | NoteRecord, value: T) => void

const replaceExtraAccess: Apply<readonly bigint[]> = (record, value) => {
  record.extraAccess = value
}

// Only a case has an assignee, and only a case's path reaches this.
const replaceAssignee: Apply<bigint | undefined> = (record, value) => {
  if (!("caseId" in record)) {
    record.assignedToId = value
  }
}

const replaceTags: Apply<readonly string[]> = (record, value) => {
  record.tags = value
}

// A PUT that replaces one field of a case, or of one of its notes when the path names a note.
function replace<T>(
  { store }: Service,
  context: Context,
  body: PyValue,
  field: readonly [name: string, validate: Validator<T>, apply: Apply<T>],
): Response {
  const [name, validate, apply] = field
  const errors: FieldError[] = []
  const caseId = pathInteger(context, "caseId", "case_id", errors)
  const hasNote = context.req.param("noteId") !== undefined
  const noteId = hasNote ? pathInteger(context, "noteId", "note_id", errors) : undefined
  const fields = modelOf(body, errors)
  const value = fields && bodyField(fields, name, errors, validate, true)
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  storable(caseId, noteId, value)
  const record = noteId === undefined ? store.findCase(caseId) : store.findNote(caseId, noteId)
  if (record === undefined) {
    return detail(context, hasNote ? "Note not found" : "Case not found", 404)
  }
  // Past validation only a nullable field is undefined, and there undefined is its null.
  apply(record, value as T)
  return answer(context, "caseId" in record ? noteJson(record) : caseJson(record))
}

function listTags({ store }: Service, context: Context): Response {
  const tags = new Set([...store.cases, ...store.notes].flatMap((record) => record.tags))
  // `ORDER BY tag` sorts by the database's collation, which in the dev environment's container is
  // byte order over UTF-8 – capitals before lowercase, and anything beyond ASCII last.
  return answer(
    context,
    [...tags].toSorted((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))),
  )
}

type Method = "DELETE" | "GET" | "PATCH" | "POST" | "PUT"

// Every path the service declares, with its methods in declaration order. Starlette answers any
// other method with 405, allowing the first route that matched the path.
const declared: readonly (readonly [string, readonly Method[]])[] = [
  ["/cases", ["POST", "GET"]],
  ["/cases/:caseId/close", ["POST"]],
  ["/cases/:caseId/reopen", ["POST"]],
  ["/cases/:caseId/notes", ["POST", "GET"]],
  ["/cases/:caseId/extra_access", ["PUT"]],
  ["/cases/:caseId/notes/:noteId/extra_access", ["PUT"]],
  ["/cases/:caseId/assignee", ["PUT"]],
  ["/cases/:caseId/tags", ["PUT"]],
  ["/cases/:caseId/notes/:noteId/tags", ["PUT"]],
  ["/cases/tags", ["GET"]],
  ["/cases/types", ["GET"]],
]
const methods: readonly Method[] = ["DELETE", "GET", "PATCH", "POST", "PUT"]

function isDeclared(path: string): boolean {
  const segments = path.split("/")
  return declared.some(([pattern]) => {
    const expected = pattern.split("/")
    return (
      expected.length === segments.length &&
      expected.every((part, index) => {
        const segment = segments.at(index) ?? ""
        return part.startsWith(":") ? segment !== "" : part === segment
      })
    )
  })
}

// Starlette's answer to a path that matches a route only without its trailing slashes: a
// redirect to that path. The service runs at the root of its origin behind an ingress that strips
// its prefix, so the address it builds drops the prefix – on dev as here.
function withoutTrailingSlash(context: Context): Response {
  const url = new URL(context.req.url)
  let path = url.pathname.slice(url.pathname.indexOf("/cases"))
  while (path.endsWith("/")) {
    path = path.slice(0, -1)
  }
  if (!url.pathname.endsWith("/") || !isDeclared(path)) {
    return notFound(context)
  }
  return context.redirect(`http://${url.host}${path}${url.search}`, 307)
}

type Handler = (context: Context, user: AuthUser, body: PyValue) => Response
type Route = (context: Context) => Promise<Response>

// What FastAPI runs before a route, in its order: the body, then the token.
function guarded(dependencies: ProjectDependencies, hasBody: boolean, handle: Handler): Route {
  return async (context: Context): Promise<Response> => {
    const body = hasBody ? await readBody(context) : undefined
    if (body instanceof Response) {
      return body
    }
    const user = requireAuthUser(context, dependencies.key, dependencies.now())
    if (user instanceof Response) {
      return user
    }
    try {
      return handle(context, user, body)
    } catch (error) {
      if (error instanceof ServiceFailure) {
        return internalError(context)
      }
      throw error
    }
  }
}

/**
 * Builds `/cases` and everything beneath it over a store of its own, seeded with the health
 * team's cases, so every app starts from the same cases and a test's writes stay in its app.
 * @param dependencies The auth service's key, and the clock that dates what is written.
 * @returns The routes, ready to be mounted at the project API's root.
 */
export function caseRoutes(dependencies: ProjectDependencies): Hono {
  const service: Service = { now: dependencies.now, store: seededStore() }
  const route = (hasBody: boolean, handle: Handler): Route => guarded(dependencies, hasBody, handle)
  const put = <T>(name: string, validate: Validator<T>, apply: Apply<T>): Route =>
    route(true, (context, _user, body) => replace(service, context, body, [name, validate, apply]))

  const router = new Hono()
  router.post(
    "/cases",
    route(true, (context, user, body) => createCase(service, context, user, body)),
  )
  router.get(
    "/cases",
    route(false, (context) => listCases(service, context)),
  )
  router.post(
    "/cases/:caseId/close",
    route(false, (context, user) => setClosed(service, context, user, true)),
  )
  router.post(
    "/cases/:caseId/reopen",
    route(false, (context, user) => setClosed(service, context, user, false)),
  )
  router.post(
    "/cases/:caseId/notes",
    route(true, (context, user, body) => createNote(service, context, user, body)),
  )
  router.get(
    "/cases/:caseId/notes",
    route(false, (context, user) => listNotes(service, context, user)),
  )
  router.put("/cases/:caseId/extra_access", put("extra_access", integers, replaceExtraAccess))
  router.put(
    "/cases/:caseId/notes/:noteId/extra_access",
    put("extra_access", integers, replaceExtraAccess),
  )
  router.put("/cases/:caseId/assignee", put("assigned_to_id", toNullableInteger, replaceAssignee))
  router.put("/cases/:caseId/tags", put("tags", texts, replaceTags))
  router.put("/cases/:caseId/notes/:noteId/tags", put("tags", texts, replaceTags))
  router.get(
    "/cases/tags",
    route(false, (context) => listTags(service, context)),
  )
  router.get(
    "/cases/types",
    route(false, (context) => answer(context, caseTypes)),
  )
  for (const [path, allowed] of declared) {
    const refused = methods.filter((method) => !allowed.includes(method))
    router.on(refused, path, (context) => {
      context.header("Allow", allowed.at(0))
      return context.json({ detail: "Method Not Allowed" }, 405)
    })
  }
  router.all("/cases/*", (context) => withoutTrailingSlash(context))
  return router
}
