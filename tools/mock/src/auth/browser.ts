import { createHash, randomBytes } from "node:crypto"

import type { Context } from "hono"

import { extractRoles, type Claims } from "../claims.ts"
import { missingError, plainText, readCookie, validationFailed } from "../fastapi.ts"
import { field } from "../json.ts"
import { scoutIdUrl } from "../scoutid/provider.ts"
import { settings } from "../settings.ts"
import {
  accessTokenCookie,
  clearAuthCookies,
  clearTransientCookies,
  idTokenCookie,
  oidcCodeVerifierCookie,
  oidcStateCookie,
  redirectUriCookie,
  refreshTokenCookie,
  setLoginFlowCookies,
} from "./cookies.ts"
import { applySession, isRedirectUriAllowed, type AuthDependencies } from "./session.ts"
import { verifyAccessToken } from "./tokens.ts"

/**
 * The auth service's browser contract – the five routes a browser navigates or fetches – each
 * answering as `routes.py` answers.
 */

// The callback registered at ScoutID, derived from the public URL so the authorization request
// and the code exchange send it byte for byte alike.
const callbackUrl = `${settings.publicUrl}callback`

function unauthorized(context: Context): Response {
  return context.json({ error: "Unauthorized" }, 401)
}

function redirectUriMissing(context: Context): Response {
  return validationFailed(context, [missingError(["query", "redirect_uri"])])
}

/**
 * `GET /login` – starts the round trip: checks where the browser is to come back to, carries
 * the PKCE verifier, the state, and that address across in cookies, and sends the browser to
 * ScoutID – asking it not to prompt when `silent=true`.
 * @param context The request.
 * @returns The redirect, or the refusal.
 */
export function login(context: Context): Response {
  const redirectUri = context.req.query("redirect_uri")
  if (redirectUri === undefined) {
    return redirectUriMissing(context)
  }
  if (!isRedirectUriAllowed(redirectUri)) {
    return plainText(context, "Invalid redirect URI", 400)
  }
  const codeVerifier = randomBytes(64).toString("base64url")
  const state = randomBytes(32).toString("base64url")
  const parameters = new URLSearchParams({
    client_id: settings.oidcClientId,
    response_type: "code",
    redirect_uri: callbackUrl,
    scope: "openid profile email",
    state,
    code_challenge: createHash("sha256").update(codeVerifier).digest("base64url"),
    code_challenge_method: "S256",
  })
  if (context.req.query("silent") === "true") {
    parameters.set("prompt", "none")
  }
  const locale = context.req.query("locale")
  if (locale) {
    parameters.set("ui_locales", locale)
  }
  setLoginFlowCookies(context, { codeVerifier, redirectUri, state })
  return context.redirect(`${scoutIdUrl}auth?${parameters.toString()}`, 302)
}

/**
 * `GET /callback` – ScoutID's way back: checks the round trip's cookies against what came back,
 * redeems the code, mints the session, and returns the browser to where it started. A silent
 * login with no session at ScoutID lands here too, and goes back signed out.
 * @param context The request.
 * @param dependencies The key, the clock, the role map, and ScoutID.
 * @returns The redirect, or the refusal.
 */
export function completeLogin(context: Context, dependencies: AuthDependencies): Response {
  const now = dependencies.now()
  const finalRedirectUri = readCookie(context, redirectUriCookie)
  if (!isRedirectUriAllowed(finalRedirectUri)) {
    return plainText(context, "Invalid redirect URI", 400)
  }
  const providerError = context.req.query("error")
  if (providerError) {
    if (providerError !== "login_required") {
      return plainText(context, `Authentication failed: ${providerError}`, 400)
    }
    clearAuthCookies(context, now)
    return context.redirect(finalRedirectUri, 302)
  }
  const codeVerifier = readCookie(context, oidcCodeVerifierCookie)
  if (!codeVerifier) {
    return plainText(context, "Missing code verifier", 400)
  }
  const expectedState = readCookie(context, oidcStateCookie)
  if (!expectedState || context.req.query("state") !== expectedState) {
    return plainText(context, "Invalid state", 400)
  }
  const code = context.req.query("code")
  if (!code) {
    return plainText(context, "Missing authorization code", 400)
  }
  try {
    applySession(context, dependencies.scoutId.exchangeCode(code, codeVerifier), dependencies)
  } catch {
    return plainText(context, "Authentication failed", 502)
  }
  clearTransientCookies(context, now)
  return context.redirect(finalRedirectUri, 302)
}

/**
 * `GET /refresh` – re-mints the access token from the refresh cookie, looking the roles up
 * again. A session ScoutID has ended answers 401 and clears every cookie, so the client stops
 * retrying.
 * @param context The request.
 * @param dependencies The key, the clock, the role map, and ScoutID.
 * @returns `{}` with fresh cookies, or the refusal.
 */
export function refresh(context: Context, dependencies: AuthDependencies): Response {
  const refreshToken = readCookie(context, refreshTokenCookie)
  if (!refreshToken) {
    return unauthorized(context)
  }
  try {
    applySession(context, dependencies.scoutId.refresh(refreshToken), dependencies)
  } catch {
    clearAuthCookies(context, dependencies.now())
    return unauthorized(context)
  }
  return context.json({})
}

/**
 * `GET /user` – the signed-in member, read from the access token cookie.
 * @param context The request.
 * @param dependencies The key and the clock the token is verified with.
 * @returns The user, or 401 when there is no valid token.
 */
export function user(context: Context, dependencies: AuthDependencies): Response {
  const accessToken = readCookie(context, accessTokenCookie)
  if (!accessToken) {
    return unauthorized(context)
  }
  let claims: Claims
  try {
    claims = verifyAccessToken(accessToken, dependencies.key, dependencies.now())
  } catch {
    return unauthorized(context)
  }
  return context.json({
    user: {
      name: claim(claims, "name"),
      preferredUsername: claim(claims, "preferred_username"),
      givenName: claim(claims, "given_name"),
      familyName: claim(claims, "family_name"),
      email: claim(claims, "email"),
      picture: claim(claims, "picture"),
      memberNo: claim(claims, "member_no"),
      roles: extractRoles(claims),
    },
  })
}

// A claim as the body carries it: what the token holds, or null.
function claim(claims: Claims, name: string): unknown {
  // eslint-disable-next-line unicorn/no-null -- an absent claim is null in the service's body
  return field(claims, name) ?? null
}

/**
 * `GET /logout` – clears every cookie, and when the session came through ScoutID sends the
 * browser through ScoutID's end-session endpoint, so the next login does not silently sign the
 * same person straight back in.
 * @param context The request.
 * @param dependencies The clock, for the deletions.
 * @returns The redirect, or the refusal.
 */
export function logout(context: Context, dependencies: AuthDependencies): Response {
  const redirectUri = context.req.query("redirect_uri")
  if (redirectUri === undefined) {
    return redirectUriMissing(context)
  }
  if (!isRedirectUriAllowed(redirectUri)) {
    return plainText(context, "Invalid redirect URI", 400)
  }
  const idToken = readCookie(context, idTokenCookie)
  const target = idToken
    ? `${scoutIdUrl}logout?${new URLSearchParams({
        post_logout_redirect_uri: redirectUri,
        id_token_hint: idToken,
        client_id: settings.oidcClientId,
      }).toString()}`
    : redirectUri
  clearAuthCookies(context, dependencies.now())
  return context.redirect(target, 302)
}
