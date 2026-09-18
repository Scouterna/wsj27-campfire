import { fetch, leaderUnit, stringOrFallback, type User } from "@scouterna/wsj27-campfire-utils"
import type { QueryClient } from "@tanstack/react-query"

import type { Registration } from "../model/Registration"
import { markFor, roleLineFor, roleLineWithUnitFor } from "../model/User"
import { toRoles } from "./dto/RoleDto"
import { fetchRegistrationQuery } from "./fetch-registration"

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
 * @param client The application's one query client, so the participants-service read
 * behind the unit and the travel choice shares the cache every other read uses.
 * @returns The signed-in user, or undefined when nobody is.
 */
export async function currentUser(client: QueryClient): Promise<User | undefined> {
  const first = await ask()
  if (first !== undefined) {
    return withRegistration(client, first)
  }

  try {
    await fetch("/api/auth/refresh")
  } catch {
    return undefined
  }

  const second = await ask()
  return second === undefined ? undefined : withRegistration(client, second)
}

/**
 * Completes the user from the list of participants, through the query cache: the unit
 * where the roles gave none, and how they travel – a fact only the list holds, so even
 * a placed leader costs the one cached read. Every failure is simply a user without
 * the facts – the answer is allowed to be nothing, and nobody is put on a bus the list
 * did not book. Only a refusal is remembered; a service that could not be reached is
 * asked again the next time.
 * @param client The query client the read caches in.
 * @param user The decoded user, with whatever unit the roles gave.
 * @returns The user, completed with whatever the list of participants knows.
 */
async function withRegistration(client: QueryClient, user: User): Promise<User> {
  if (user.memberNo === "") {
    return user
  }

  let registration: Registration | null
  try {
    registration = await client.query(fetchRegistrationQuery(user.memberNo))
  } catch {
    // The service could not be asked at all. The session goes on without the facts,
    // and because the query threw rather than settled, the next ask tries again.
    return user
  }
  if (registration === null) {
    return user
  }

  // The roles' unit wins where both know one: the role is the appointment, the list a
  // reading of it.
  const unit = user.unit ?? registration.unit
  // A unit the list supplied changes the mark the person wears, and – for a leader
  // whose role named no unit – the line that names it.
  const mark = markFor(user.roles, unit)
  return {
    ...user,
    roleLineWithUnit: roleLineWithUnitFor(user.roles, unit),
    ...(mark !== undefined && { mark }),
    ...(registration.travel !== undefined && { travel: registration.travel }),
    ...(unit !== undefined && { unit }),
  }
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
  const unit = leaderUnitNumber === undefined ? undefined : { number: leaderUnitNumber }
  const mark = markFor(roles, unit)

  return {
    // The greeting name, derived once here: the given name the provider sent, or the
    // full name's first word when it sent none – an empty name greets nobody rather
    // than crashing.
    firstName: givenName === "" ? (name.trim().split(/\s+/u, 1)[0] ?? "") : givenName,
    memberNo: stringOrFallback(record["memberNo"]),
    name,
    roleLine: roleLineFor(roles),
    roleLineWithUnit: roleLineWithUnitFor(roles, unit),
    roles,
    // Spread rather than assigned: an absent unit is a missing key, not a key holding
    // undefined, which is the distinction `exactOptionalPropertyTypes` holds the code to.
    ...(mark !== undefined && { mark }),
    ...(unit !== undefined && { unit }),
  }
}
