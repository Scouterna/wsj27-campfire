import type { Context } from "hono"

import type { SigningKey } from "../keys.ts"
import type { ScoutId, UpstreamTokens } from "../scoutid/provider.ts"
import { settings } from "../settings.ts"
import { setSessionCookies } from "./cookies.ts"
import { memberNoFromClaims, type RoleCache } from "./roles.ts"
import { mintAccessToken } from "./tokens.ts"

/**
 * What the auth routes run against: the key they sign with, the clock, the role map, and the
 * identity provider.
 */
export interface AuthDependencies {
  readonly key: SigningKey
  readonly now: () => number
  readonly roles: RoleCache
  readonly scoutId: ScoutId
}

/**
 * Whether login and logout may send a browser to an address: its host, port included, is on
 * the allowlist. Scheme and path are not checked, because apps come back to any path of their
 * own. The host is read the way Python's `urlsplit` reads it.
 * @param uri The address, if one was sent.
 * @returns Whether the address is allowed.
 */
export function isRedirectUriAllowed(uri: string | undefined): uri is string {
  if (!uri) {
    return false
  }
  const host = networkLocation(uri)
  return host !== undefined && settings.allowedRedirectDomains.includes(host)
}

// urlsplit strips leading control characters and spaces, drops tabs and newlines anywhere,
// takes an optional scheme, and reads the authority only after `//`.
function networkLocation(uri: string): string | undefined {
  let start = 0
  while (start < uri.length && (uri.codePointAt(start) ?? 0) <= 32) {
    start += 1
  }
  const cleaned = uri.slice(start).replaceAll(/[\t\n\r]/gu, "")
  const rest = cleaned.replace(/^[A-Za-z][\d+.A-Za-z-]*:/u, "")
  return /^\/\/([^#/?]*)/u.exec(rest)?.[1]
}

/**
 * Turns ScoutID's tokens into the service's own session: the member number read from the
 * identity claims, the roles looked up for it, a token minted, and the cookies set.
 * @param context The response being built.
 * @param upstream What ScoutID answered a code or a refresh grant with.
 * @param dependencies The key, the clock, the role map, and ScoutID.
 */
export function applySession(
  context: Context,
  upstream: UpstreamTokens,
  dependencies: AuthDependencies,
): void {
  const { key, now, roles, scoutId } = dependencies
  // The id token is the proof of authentication; the access token fills in any claim the id
  // token lacks, without overriding one it has.
  const claims = {
    ...scoutId.claimsOf(upstream.access_token),
    ...scoutId.claimsOf(upstream.id_token),
  }
  const memberNo = memberNoFromClaims(claims)
  const minted = mintAccessToken(claims, roles.rolesFor(memberNo), memberNo, key, now())
  setSessionCookies(
    context,
    {
      accessToken: minted.token,
      expiresIn: minted.expiresIn,
      idToken: upstream.id_token,
      refreshExpiresIn: upstream.refresh_expires_in,
      refreshToken: upstream.refresh_token,
    },
    now(),
  )
}
