import { fetch, HttpError, type User } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { ImpersonationTarget } from "../model/ImpersonationTarget"
import { toTargets } from "./dto/TargetDto"
import { decodeUser } from "./dto/UserDto"

/**
 * The client half of the auth service's impersonation, which replaces the session with
 * one for another member – their member number, their roles, and their name, and nothing
 * of the caller's. The service offers it only where it is switched on, which is a test
 * environment, never production, and nothing in the session says that it is in use, so
 * the page remembers an impersonation it started itself.
 */

/**
 * Where the auth service impersonates. It answers only a POST, and only where
 * impersonation is switched on.
 */
const address = "/api/auth/impersonate"

/**
 * The key whether impersonation is offered is cached under.
 */
type OfferQueryKey = readonly ["authentication", "impersonation", "offer"]

/**
 * The key the people who may be impersonated are cached under.
 */
type TargetsQueryKey = readonly ["authentication", "impersonation", "targets"]

/**
 * How long the people who may be impersonated count as fresh. Who leads a unit or sits in
 * the management changes seldom, so a picker opened within the hour reads the cache.
 */
const targetsStaleTime = 60 * 60 * 1000

/**
 * Query options for whether the auth service offers impersonation here. The application
 * never knows its environment, so it asks the service: the route answers a GET with 405
 * where it exists and with 404 where it is switched off, and only the 405 is an offer.
 *
 * Any other refusal by the service settles as no offer, while a server error, a request
 * that reached nothing, or an answer that was not the service's – a bare dev server's own
 * page – throws, so it is never remembered as an answer and the next load asks again. A
 * 401 is rethrown for the session to act on. The answer changes only with a deploy, so it
 * is asked once per cache rather than on every mount.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or the client's `query`.
 */
export function fetchImpersonationOfferQuery(): UseQueryOptions<
  boolean,
  Error,
  boolean,
  OfferQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<boolean> => {
      try {
        await fetch<unknown>(address)
      } catch (error) {
        if (error instanceof HttpError && error.status !== 401 && error.status < 500) {
          return error.status === 405
        }
        throw error
      }
      // A GET that succeeds is not the auth service's route.
      return false
    },
    queryKey: ["authentication", "impersonation", "offer"] as const,
    // Only when stale, rather than the application's every mount, since the stale time
    // is what spares the request.
    refetchOnMount: true,
    staleTime: Infinity,
  })
}

/**
 * One listing's rows. An empty listing answers 404 – the service's shape for "nothing
 * here" – which means no rows, not a failure.
 * @param key The listing to read – `al` for the leaders, `cmt` for the management.
 * @returns The rows as they arrived, empty when the listing holds none.
 */
async function listing(key: string): Promise<readonly unknown[]> {
  try {
    const rows = await fetch<unknown>(`/api/project/participants/troopinfo/${key}?infolevel=basic`)
    return Array.isArray(rows) ? (rows as readonly unknown[]) : []
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return []
    }
    throw error
  }
}

/**
 * Query options for everybody the auth service may be asked to become: the leaders and
 * the contingent management, the two listings whose members hold roles. Reading both
 * takes the management's reach, so a leader's read is refused.
 *
 * The cache holds the rows as they arrived and `select` converts them on the way out, so
 * a change to the converter never meets a persisted payload in an older shape.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or the client's `query`.
 */
export function fetchImpersonationTargetsQuery(): UseQueryOptions<
  unknown,
  Error,
  readonly ImpersonationTarget[],
  TargetsQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<unknown> => {
      const [leaders, management] = await Promise.all([listing("al"), listing("cmt")])
      return [...management, ...leaders]
    },
    queryKey: ["authentication", "impersonation", "targets"] as const,
    // Only when stale, rather than the application's every mount, since the stale time
    // is what spares the two listings.
    refetchOnMount: true,
    select: toTargets,
    staleTime: targetsStaleTime,
  })
}

/**
 * Why the auth service did not become the chosen member: the caller may not
 * impersonate, the member cannot be impersonated here, the service has not read the roles
 * yet, or anything else.
 */
export type ImpersonationFailure = "failed" | "forbidden" | "notReady" | "unavailable"

/**
 * The auth service refusing to become the chosen member, with the reason a screen words
 * for the person.
 */
export class ImpersonationError extends Error {
  /**
   * Why it was refused.
   */
  readonly failure: ImpersonationFailure

  /**
   * @param failure Why it was refused.
   * @param cause What the request threw.
   */
  constructor(failure: ImpersonationFailure, cause: unknown) {
    super(`The auth service did not impersonate: ${failure}`, { cause })
    this.name = "ImpersonationError"
    this.failure = failure
  }
}

/**
 * The reason a failed request stands for.
 * @param error What the request threw.
 * @returns The failure. A 404 is both a member the service will not become and a route
 * switched off since the offer was cached, and either way the member cannot be had here.
 */
function failureOf(error: unknown): ImpersonationFailure {
  if (!(error instanceof HttpError)) {
    return "failed"
  }
  switch (error.status) {
    case 403: {
      return "forbidden"
    }
    case 404: {
      return "unavailable"
    }
    case 503: {
      return "notReady"
    }
    default: {
      return "failed"
    }
  }
}

/**
 * Asks the auth service to become another member. On success the service has already
 * replaced the session cookies, so whatever the page holds belongs to the caller, not to
 * the session now in force, and the page must be loaded again.
 * @param memberNo The member to become.
 * @returns The member now signed in, or undefined when the session was replaced but its
 * answer is not a user this module can decode – the service leaves the name out when it
 * cannot look it up.
 * @throws {ImpersonationError} When the service refused, saying why.
 */
export async function impersonate(memberNo: string): Promise<User | undefined> {
  let answer: unknown
  try {
    answer = await fetch<unknown>(address, { body: { member_no: memberNo }, method: "POST" })
  } catch (error) {
    throw new ImpersonationError(failureOf(error), error)
  }
  return decodeUser(answer)
}

/**
 * The storage key the impersonated member number is remembered under, in local storage
 * beside the session it describes. It is only ever a hint: a remembered member number
 * that is not the one signed in says nothing.
 */
const storageKey = "campfire-impersonation"

/**
 * Remembers that the page has made the session another member's, which is the only way
 * the profile page knows to offer the way back. A browser that refuses its storage
 * remembers nothing, and the profile page then offers only the ordinary way out.
 * @param memberNo The member the session now belongs to.
 */
export function rememberImpersonation(memberNo: string): void {
  try {
    localStorage.setItem(storageKey, memberNo)
  } catch {
    // Nothing remembered, which costs only the shortcut back.
  }
}

/**
 * Whether the session signed in now is one this page made another member's.
 * @param memberNo The member number signed in now.
 * @returns True when the remembered impersonation is of this member.
 */
export function isImpersonating(memberNo: string): boolean {
  if (memberNo === "") {
    return false
  }
  try {
    return localStorage.getItem(storageKey) === memberNo
  } catch {
    return false
  }
}

/**
 * Forgets the impersonation, on the way back or out.
 */
export function forgetImpersonation(): void {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // A storage that cannot be written holds nothing to forget.
  }
}
