import type { User } from "@scouterna/wsj27-campfire-utils"
import type { QueryClient } from "@tanstack/react-query"

import type { Registration } from "../model/Registration"
import { markFor, roleLineWithUnitFor } from "../model/User"
import { hasRefreshWindow, readExpiry } from "./expiry"
import { fetchRegistrationQuery } from "./fetch-registration"
import { askAgain } from "./session"

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
 * Where to send the browser to sign in. It is a full-page navigation rather than a
 * fetch, because the service redirects on to ScoutID and back, and it asks for Swedish,
 * so the provider's own screens arrive in the language the rest of Campfire speaks.
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
 * not an error. An auth service that could not be reached also reads as signed out:
 * at boot the screen behind this shows sign-in either way, and signing in is what
 * proves the connection works.
 *
 * The ask is the session's own, so a boot that meets a read already asking joins it
 * rather than asking twice, and the answer becomes the session every later read is
 * checked against.
 *
 * @param client The application's one query client, so the participants-service read
 * behind the unit and the travel choice shares the cache every other read uses.
 * @returns The signed-in user, or undefined when nobody is.
 */
export async function currentUser(client: QueryClient): Promise<User | undefined> {
  if (!canBeSignedIn()) {
    return undefined
  }
  const answer = await askAgain()
  return answer.kind === "somebody" ? withRegistration(client, answer.user) : undefined
}

/**
 * Whether a session could exist on this browser, judged from the auth service's cookies
 * rather than from storage the browser may wipe while the session lives on. It answers
 * true without either cookie as well, because the refresh window's cookie is httpOnly,
 * so its absence does not mean nobody.
 * @returns True when the page should ask the auth service who is signed in.
 */
// eslint-disable-next-line sonarjs/no-invariant-returns -- the httpOnly refresh cookie leaves every path asking
function canBeSignedIn(): boolean {
  const cookie = document.cookie
  // The refresh window is open, so a session exists however long ago the token lapsed.
  if (hasRefreshWindow(cookie)) {
    return true
  }
  // A live access token, which the landing straight after sign-in carries too.
  if (readExpiry(cookie) !== undefined) {
    return true
  }
  // eslint-disable-next-line sonarjs/todo-tag -- deliberate, until the auth service ships the cookie
  // TODO: Answer false here once the auth service sets `wsj27-auth_refresh-expires-at`
  // without httpOnly. Until then the page cannot see that cookie, so its absence does
  // not mean nobody: a leader whose token lapsed while the refresh window is open looks
  // exactly like a visitor who never signed in, and only asking tells them apart – at
  // the cost of two 401s in the console for the visitor. When the service ships it,
  // make the mock in `tools/mock/src/auth/cookies.ts` set it readable too, and bring
  // back the walk proving a first visit asks nothing and leaves the console clean.
  return true
}

/**
 * Completes the user from the list of participants, through the query cache, with the
 * unit where the roles gave none and with how they travel. Only the list holds the
 * travel, so even a placed leader costs the one cached read. Every failure is a user
 * without the facts, so nobody is put on a bus the list did not book.
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

  // The roles' unit wins where both know one, because the role is the appointment and
  // the list a reading of it.
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
