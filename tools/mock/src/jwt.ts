import { Buffer } from "node:buffer"
import { createSign, createVerify } from "node:crypto"

import { field, isRecord } from "./json.ts"
import type { SigningKey } from "./keys.ts"

/**
 * A token that failed a check. Neither service tells a caller which check it failed, so
 * nothing that catches this needs to know either.
 */
export class JwtError extends Error {}

/**
 * What a token is held to beyond its signature and its times.
 */
export interface ClaimChecks {
  /**
   * The `aud` the token has to carry, when there is one to check.
   */
  readonly audience?: string
  /**
   * The `iss` the token has to carry, when there is one to check.
   */
  readonly issuer?: string
  /**
   * The clock the times are checked against, in milliseconds.
   */
  readonly now: number
}

// The clock skew joserfc's claims registry allows either way – both services construct it
// with thirty seconds.
const leewaySeconds = 30

/**
 * Signs claims as an RS256 JWT, with the header joserfc writes.
 * @param claims The payload, in the order it should serialize.
 * @param key The key to sign with.
 * @returns The compact token.
 */
export function encodeJwt(claims: Readonly<Record<string, unknown>>, key: SigningKey): string {
  const header = { typ: "JWT", alg: "RS256", kid: key.kid }
  const input = `${encodeSegment(header)}.${encodeSegment(claims)}`
  const signature = createSign("RSA-SHA256").update(input).sign(key.privateKey, "base64url")
  return `${input}.${signature}`
}

/**
 * Verifies a compact RS256 JWT and returns its claims. Throws a `JwtError` when the token is
 * malformed, signed by another key, expired, not valid yet, or carries the wrong issuer or
 * audience.
 * @param token The compact token.
 * @param key The key whose public half verifies it.
 * @param checks The issuer, the audience, and the clock to hold it to.
 * @returns The token's claims.
 */
export function decodeJwt(
  token: string,
  key: SigningKey,
  checks: ClaimChecks,
): Readonly<Record<string, unknown>> {
  const [header, payload, signature, ...rest] = token.split(".")
  if (header === undefined || payload === undefined || signature === undefined || rest.length > 0) {
    throw new JwtError("Malformed token")
  }
  const headerClaims = decodeSegment(header)
  if (
    headerClaims["alg"] !== "RS256" ||
    (headerClaims["kid"] !== undefined && headerClaims["kid"] !== key.kid)
  ) {
    throw new JwtError("No key for this token")
  }
  const isVerified = createVerify("RSA-SHA256")
    .update(`${header}.${payload}`)
    .verify(key.publicKey, signature, "base64url")
  if (!isVerified) {
    throw new JwtError("Bad signature")
  }
  const claims = decodeSegment(payload)
  holdTimes(claims, Math.floor(checks.now / 1000))
  if (checks.issuer !== undefined && claims["iss"] !== checks.issuer) {
    throw new JwtError("Wrong issuer")
  }
  if (checks.audience !== undefined && !hasAudience(claims["aud"], checks.audience)) {
    throw new JwtError("Wrong audience")
  }
  return claims
}

function encodeSegment(value: Readonly<Record<string, unknown>>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function decodeSegment(segment: string): Readonly<Record<string, unknown>> {
  let value: unknown
  try {
    value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"))
  } catch {
    throw new JwtError("Malformed token")
  }
  if (!isRecord(value)) {
    throw new JwtError("Malformed token")
  }
  return value
}

// joserfc checks each time claim only when it is present, and refuses one that is not a
// number – null included.
function holdTimes(claims: Readonly<Record<string, unknown>>, now: number): void {
  const expires = timeClaim(claims, "exp")
  if (expires !== undefined && expires < now - leewaySeconds) {
    throw new JwtError("Expired")
  }
  const notBefore = timeClaim(claims, "nbf")
  if (notBefore !== undefined && notBefore > now + leewaySeconds) {
    throw new JwtError("Not valid yet")
  }
  const issuedAt = timeClaim(claims, "iat")
  if (issuedAt !== undefined && issuedAt > now + leewaySeconds) {
    throw new JwtError("Issued in the future")
  }
}

function timeClaim(claims: Readonly<Record<string, unknown>>, name: string): number | undefined {
  const value = field(claims, name)
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== "number") {
    throw new JwtError(`Invalid ${name}`)
  }
  return value
}

function hasAudience(claim: unknown, audience: string): boolean {
  if (typeof claim === "string") {
    return claim === audience
  }
  return Array.isArray(claim) && claim.includes(audience)
}
