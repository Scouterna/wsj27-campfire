import type { Context } from "hono"

import { extractRoles } from "../claims.ts"
import { readCookie } from "../fastapi.ts"
import { field } from "../json.ts"
import { decodeJwt } from "../jwt.ts"
import type { SigningKey } from "../keys.ts"

/**
 * Who is asking, as `authenctication.py` works it out: the auth service's token from its cookie
 * or a bearer header, verified against the auth service's keys, and the role checks every route
 * asks of it.
 */

// The auth service's cookie, which the project API reads by this literal name.
const accessTokenCookie = "wsj27-auth_access-token"

/**
 * The verified caller.
 */
export interface AuthUser {
  readonly email: string | undefined
  readonly familyName: string
  readonly givenName: string
  readonly memberNo: string
  readonly name: string
  readonly preferredUsername: string
  /**
   * Every role the token carries, flattened and sorted.
   */
  readonly roles: readonly string[]
}

/**
 * True if any held role is `required` or a more specific role beneath it. Compared segment by
 * segment, never as a string prefix: `wsj27:cmtx` is not a `wsj27:cmt` role.
 * @param held The roles the caller holds.
 * @param required The role the check demands.
 * @returns Whether the requirement is met.
 */
export function hasRole(held: readonly string[], required: string): boolean {
  const depth = required.split(":").length
  return held.some((role) => role.split(":").slice(0, depth).join(":") === required)
}

/**
 * True if `hasRole` holds for any one of `required`.
 * @param held The roles the caller holds.
 * @param required The roles any one of which satisfies the check.
 * @returns Whether any requirement is met.
 */
export function hasAnyRole(held: readonly string[], required: readonly string[]): boolean {
  return required.some((requirement) => hasRole(held, requirement))
}

/**
 * The trailing segments of every held role strictly beneath `prefix` – for `wsj27:al`, the
 * troops a leader's authority covers. Empty means no roles under the prefix, which a caller
 * treats as nothing, never as everything.
 * @param held The roles the caller holds.
 * @param prefix The role the suffixes are taken from beneath.
 * @returns The trailing segments.
 */
export function roleSuffixes(held: readonly string[], prefix: string): ReadonlySet<string> {
  const depth = prefix.split(":").length
  const suffixes = new Set<string>()
  for (const role of held) {
    const segments = role.split(":")
    if (segments.length > depth && hasRole([segments.slice(0, depth).join(":")], prefix)) {
      suffixes.add(segments.slice(depth).join(":"))
    }
  }
  return suffixes
}

/**
 * The dependency every route runs first. No token, or one that does not verify, answers 401; a
 * token that carries no `wsj27:` role at all answers 403. The token's issuer and audience are
 * not checked – the project API checks neither.
 * @param context The request.
 * @param key The auth service's signing key, standing in for its published key set.
 * @param now The clock, in milliseconds.
 * @returns The caller, or the refusal to answer with.
 */
export function requireAuthUser(
  context: Context,
  key: SigningKey,
  now: number,
): AuthUser | Response {
  let token = readCookie(context, accessTokenCookie)
  const authorization = context.req.header("Authorization") ?? ""
  if (!token && authorization.startsWith("Bearer ")) {
    token = authorization.slice("Bearer ".length)
  }
  if (!token) {
    return context.json({ detail: "Unauthorized" }, 401)
  }
  let claims: Readonly<Record<string, unknown>>
  try {
    claims = decodeJwt(token, key, { now })
  } catch {
    return context.json({ detail: "Unauthorized" }, 401)
  }
  const roles = extractRoles(claims)
  if (roles.every((role) => !role.startsWith("wsj27:"))) {
    return context.json({ detail: "No suitable roles" }, 403)
  }
  const text = (name: string): string => {
    const value = field(claims, name)
    return typeof value === "string" ? value : ""
  }
  return {
    email: typeof field(claims, "email") === "string" ? text("email") : undefined,
    familyName: text("family_name"),
    givenName: text("given_name"),
    memberNo: text("member_no"),
    name: text("name"),
    preferredUsername: text("preferred_username"),
    roles,
  }
}
