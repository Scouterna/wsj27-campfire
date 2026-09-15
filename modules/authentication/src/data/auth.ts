import { fetch, leaderUnit, stringOrFallback } from "@scouterna/wsj27-campfire-utils"
import type { QueryClient } from "@tanstack/react-query"

import type { User } from "../model/User"
import { toRoles } from "./dto/RoleDto"
import { fetchUnitQuery } from "./fetch-unit"

/**
 * The client half of wsj27-auth-api's browser contract.
 *
 * The service lives under `/api/auth` on the application's own origin – the production
 * ingress puts it there, and the local environment proxies the same prefix to the mock –
 * so every address here is origin-relative and the code never knows which environment it
 * is in. The session itself is httpOnly cookies the browser carries; this module never
 * sees a token.
 */

/**
 * Whether the keep-alive script has been added already – a page has one loop, not one
 * per screen that asks.
 */
const injected = { refresh: false }

/**
 * Where to send the browser to sign in. A full-page navigation, not a fetch – the
 * service redirects on to ScoutID and back – and it asks for Swedish, so the provider's
 * own screens arrive in the language the rest of Campfire speaks.
 * @param returnTo The absolute URL to land on afterwards, usually `location.href`.
 * @returns The sign-in address.
 */
export function signInUrl(returnTo: string): string {
  const query = new URLSearchParams({ locale: "sv", redirect_uri: returnTo })
  return `/api/auth/login?${query.toString()}`
}

/**
 * Leaves for the sign-out round trip – out of this session and of ScoutID's. Landing
 * back on the sign-in screen is the confirmation that it worked; sign-out is a full-page
 * navigation through the auth service, so there is no path where the screen shows
 * signed-out while the session lives on.
 * @param returnTo The absolute URL to land on afterwards.
 */
export function signOut(returnTo: string): void {
  const query = new URLSearchParams({ redirect_uri: returnTo })
  location.assign(`/api/auth/logout?${query.toString()}`)
}

/**
 * Who is signed in, or undefined when nobody is – a missing session is an answer here,
 * not an error. A network failure also reads as signed out: the screen behind this
 * decides to show sign-in either way, and signing in is what proves the connection
 * works.
 *
 * The access token is short-lived on purpose, so a refused first answer is not the end:
 * a returning session usually holds a live refresh cookie, and one `/api/auth/refresh`
 * round trip re-mints the token. Only when that also refuses is nobody signed in – one
 * retry, never a loop.
 * @param client The application's one query client, so the register read behind the
 * unit shares the cache every other read uses.
 * @returns The signed-in user, or undefined when nobody is.
 */
export async function currentUser(client: QueryClient): Promise<User | undefined> {
  const first = await ask()
  if (first !== undefined) {
    return withUnit(client, first)
  }

  try {
    await fetch("/api/auth/refresh")
  } catch {
    return undefined
  }

  const second = await ask()
  return second === undefined ? undefined : withUnit(client, second)
}

/**
 * Completes a user whose roles carry no unit by asking the register, through the
 * query cache. A placed leader never costs the request, and every failure is simply a
 * user without a unit – the answer is allowed to be nothing.
 * @param client The query client the read caches in.
 * @param user The decoded user, with whatever unit the roles gave.
 * @returns The user, with the register's unit where it had none and the register knows.
 */
async function withUnit(client: QueryClient, user: User): Promise<User> {
  if (user.unit !== undefined || user.memberNo === "") {
    return user
  }

  const unit = await client.query(fetchUnitQuery(user.memberNo))
  return unit === null ? user : { ...user, unit }
}

/**
 * One question to `/api/auth/user`, with every failure reading as "nobody" – a network
 * error, a refusal, and a body that is not even JSON alike. The last one is real: with
 * no auth service behind this origin, a bare dev server answers the application's own
 * HTML.
 * @returns The signed-in user, or undefined when the answer was anything else.
 */
async function ask(): Promise<User | undefined> {
  try {
    return decodeUser(await fetch("/api/auth/user"))
  } catch {
    return undefined
  }
}

/**
 * Starts the service's own keep-alive loop, once. The script watches the public expiry
 * cookie and refreshes the session while the application is open, so an active user is
 * never bounced back to sign-in mid-task.
 */
export function keepSessionAlive(): void {
  if (injected.refresh) {
    return
  }
  injected.refresh = true
  const script = document.createElement("script")
  script.src = "/api/auth/static/refresh.js"
  document.body.append(script)
}

/**
 * Whether an untyped value is an array, narrowed to unknown members. `Array.isArray`
 * alone narrows to `any[]`, which would let every read past it lie about what it found.
 * @param value The untyped value to check.
 * @returns True when the value is an array.
 */
function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

/**
 * Defensive by design: the payload crosses a service boundary, so a shape this module
 * does not recognize reads as signed out rather than as a crash in the gate. A name and
 * a role list are the two things a session is useless without; everything else degrades
 * to an empty string.
 * @param payload The body `/api/auth/user` answered with.
 * @returns The user, or undefined when the payload is not one.
 */
export function decodeUser(payload: unknown): User | undefined {
  if (typeof payload !== "object" || payload === null || !("user" in payload)) {
    return undefined
  }
  const { user } = payload
  if (typeof user !== "object" || user === null) {
    return undefined
  }
  // The cast is honest: past this line every field is read defensively, so a shape the
  // service never promised still decodes to undefined rather than lying about a type.
  const record = user as Record<string, unknown>
  const name = record["name"]
  const spellings = record["roles"]
  if (typeof name !== "string" || !isArray(spellings)) {
    return undefined
  }
  const givenName = stringOrFallback(record["givenName"])
  // Translated here and nowhere else: a spelling the vocabulary does not know grants
  // nothing, and a non-string entry is dropped the same way.
  const roles = spellings.flatMap((spelling) =>
    typeof spelling === "string" ? toRoles(spelling) : [],
  )
  const leaderUnitNumber = leaderUnit(roles)

  return {
    // The greeting name, derived once here: the given name the provider sent, or the
    // full name's first word when it sent none – an empty name greets nobody rather
    // than crashing.
    firstName: givenName === "" ? (name.trim().split(/\s+/u, 1)[0] ?? "") : givenName,
    memberNo: stringOrFallback(record["memberNo"]),
    name,
    roles,
    // Spread rather than assigned: an absent unit is a missing key, not a key holding
    // undefined, which is the distinction `exactOptionalPropertyTypes` holds the code to.
    ...(leaderUnitNumber !== undefined && { unit: { number: leaderUnitNumber } }),
  }
}
