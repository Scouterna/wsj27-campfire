import type { Context } from "hono"

import { cookieHeader } from "../fastapi.ts"
import { settings } from "../settings.ts"

/**
 * The auth service's cookies – its names, its attributes, and the order it sets and clears
 * them in. Every one is on `Path=/`, so every app on the origin reads the same session.
 */

// The prefix is the service's name, so sibling apps on one host never collide.
const prefix = "wsj27-auth_"

/**
 * The service's own access token – httpOnly, and the cookie the project API reads.
 */
export const accessTokenCookie = `${prefix}access-token`

/**
 * When the access token expires, in milliseconds – the one cookie a script may read, which
 * is what `refresh.js` watches.
 */
export const expiresAtCookie = `${prefix}expires-at`

/**
 * ScoutID's id token, kept for the hint that ends ScoutID's session at logout.
 */
export const idTokenCookie = `${prefix}id-token`

/**
 * The PKCE verifier, carried across the round trip.
 */
export const oidcCodeVerifierCookie = `${prefix}oidc-code-verifier`

/**
 * The state the callback checks against, carried across the round trip.
 */
export const oidcStateCookie = `${prefix}oidc-state`

/**
 * Where the browser goes once the round trip is done.
 */
export const redirectUriCookie = `${prefix}redirect-uri`

/**
 * When the refresh window closes, in milliseconds.
 */
export const refreshExpiresAtCookie = `${prefix}refresh-expires-at`

/**
 * ScoutID's refresh token, which `/refresh` re-mints the access token from.
 */
export const refreshTokenCookie = `${prefix}refresh-token`

// Every cookie the service sets, in the order logout and the failure paths clear them.
const allCookies = [
  accessTokenCookie,
  refreshTokenCookie,
  idTokenCookie,
  expiresAtCookie,
  refreshExpiresAtCookie,
  oidcCodeVerifierCookie,
  oidcStateCookie,
  redirectUriCookie,
]

// The cookies that live for one round trip.
const transientCookies = [oidcCodeVerifierCookie, oidcStateCookie, redirectUriCookie]

const loginFlowTtlSeconds = 30 * 60

function setCookie(
  context: Context,
  name: string,
  value: string,
  maxAge: number,
  isHttpOnly = true,
): void {
  const header = cookieHeader(name, value, {
    httpOnly: isHttpOnly,
    maxAge,
    path: "/",
    secure: !settings.insecureCookies,
  })
  context.header("Set-Cookie", header, { append: true })
}

function deleteCookie(context: Context, name: string, now: number): void {
  const header = cookieHeader(name, "", {
    expires: now,
    httpOnly: true,
    maxAge: 0,
    path: "/",
    secure: !settings.insecureCookies,
  })
  context.header("Set-Cookie", header, { append: true })
}

/**
 * Clears every cookie the service sets – logout, and the paths that end a session.
 * @param context The response being built.
 * @param now The clock, in milliseconds, for the deletion's `expires` date.
 */
export function clearAuthCookies(context: Context, now: number): void {
  for (const name of allCookies) {
    deleteCookie(context, name, now)
  }
}

/**
 * Clears the round trip's cookies once the code they carried is spent.
 * @param context The response being built.
 * @param now The clock, in milliseconds, for the deletion's `expires` date.
 */
export function clearTransientCookies(context: Context, now: number): void {
  for (const name of transientCookies) {
    deleteCookie(context, name, now)
  }
}

/**
 * What one round trip carries across ScoutID.
 */
export interface LoginFlow {
  readonly codeVerifier: string
  readonly redirectUri: string
  readonly state: string
}

/**
 * Sets the round trip's cookies, which are the service's only state.
 * @param context The response being built.
 * @param flow The verifier, the state, and where the browser comes back to.
 */
export function setLoginFlowCookies(context: Context, flow: LoginFlow): void {
  setCookie(context, oidcCodeVerifierCookie, flow.codeVerifier, loginFlowTtlSeconds)
  setCookie(context, oidcStateCookie, flow.state, loginFlowTtlSeconds)
  setCookie(context, redirectUriCookie, flow.redirectUri, loginFlowTtlSeconds)
}

/**
 * The tokens and lifetimes one signed-in session is made of.
 */
export interface SessionCookies {
  /**
   * The service's own token.
   */
  readonly accessToken: string
  /**
   * Seconds until the access token expires.
   */
  readonly expiresIn: number
  /**
   * ScoutID's id token.
   */
  readonly idToken: string
  /**
   * Seconds until the refresh window closes.
   */
  readonly refreshExpiresIn: number
  /**
   * ScoutID's refresh token.
   */
  readonly refreshToken: string
}

/**
 * Sets the cookies that make a signed-in session, in the order the service sets them.
 * @param context The response being built.
 * @param session The tokens and their lifetimes.
 * @param now The clock, in milliseconds, for the two expiry cookies.
 */
export function setSessionCookies(context: Context, session: SessionCookies, now: number): void {
  setCookie(context, accessTokenCookie, session.accessToken, session.expiresIn)
  setCookie(context, refreshTokenCookie, session.refreshToken, session.refreshExpiresIn)
  setCookie(
    context,
    refreshExpiresAtCookie,
    String(now + session.refreshExpiresIn * 1000),
    session.refreshExpiresIn,
  )
  // Tied to the refresh lifetime, because it is needed at logout and an expired id token is
  // still a valid hint.
  setCookie(context, idTokenCookie, session.idToken, session.refreshExpiresIn)
  setCookie(
    context,
    expiresAtCookie,
    String(now + session.expiresIn * 1000),
    session.expiresIn,
    false,
  )
}
