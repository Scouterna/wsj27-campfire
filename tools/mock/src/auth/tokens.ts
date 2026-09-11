import { randomUUID } from "node:crypto"

import { roleClaims, type Claims } from "../claims.ts"
import { field } from "../json.ts"
import { decodeJwt, encodeJwt } from "../jwt.ts"
import type { SigningKey } from "../keys.ts"
import { settings } from "../settings.ts"

/**
 * The service's `iss`: its public URL without the trailing slash.
 */
export const issuer = settings.publicUrl.slice(0, -1)

// The identity claims copied from ScoutID's token into the service's own, in this order.
// Everything else ScoutID sends is dropped.
const identityClaims = [
  "sub",
  "name",
  "preferred_username",
  "given_name",
  "family_name",
  "email",
  "email_verified",
  "locale",
  "picture",
] as const

/**
 * Mints a member's access token: the registered claims, the identity claims ScoutID sent, the
 * member number under the one name consumers read, and the roles in Keycloak's claim shape.
 * @param source The identity claims ScoutID sent.
 * @param roles The roles to carry.
 * @param memberNo The member number, when one was found in the claims.
 * @param key The key to sign with.
 * @param now The clock, in milliseconds.
 * @returns The token, and how many seconds it lives.
 */
export function mintAccessToken(
  source: Claims,
  roles: readonly string[],
  memberNo: string | undefined,
  key: SigningKey,
  now: number,
): { readonly expiresIn: number; readonly token: string } {
  const claims = new Map<string, unknown>()
  for (const name of identityClaims) {
    const value = field(source, name)
    if (value !== undefined && value !== null) {
      claims.set(name, value)
    }
  }
  if (memberNo !== undefined) {
    claims.set("member_no", memberNo)
  }
  const issuedAt = Math.floor(now / 1000)
  const expiresIn = settings.accessTokenTtlSeconds
  const token = encodeJwt(
    {
      iss: issuer,
      aud: settings.audience,
      iat: issuedAt,
      nbf: issuedAt,
      exp: issuedAt + expiresIn,
      jti: randomUUID(),
      typ: "Bearer",
      ...Object.fromEntries(claims),
      ...roleClaims(roles),
    },
    key,
  )
  return { expiresIn, token }
}

/**
 * Verifies one of the service's own tokens – its signature, its times, its issuer, and its
 * audience. Throws when any of them fails.
 * @param token The compact token.
 * @param key The key the service signs with.
 * @param now The clock, in milliseconds.
 * @returns The token's claims.
 */
export function verifyAccessToken(token: string, key: SigningKey, now: number): Claims {
  return decodeJwt(token, key, { audience: settings.audience, issuer, now })
}
