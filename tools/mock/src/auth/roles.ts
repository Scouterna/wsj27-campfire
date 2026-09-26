import type { Claims } from "../claims.ts"
import { field } from "../json.ts"

/**
 * The member-to-roles map the auth service caches from the project API, and what it answers
 * for a member the map does not list. The real service polls the map over HTTP every hour; the
 * mock's list of participants cannot change while it runs, so the cache is filled once, from the
 * same map `/api/project/participants/roles` serves.
 */
export class RoleCache {
  readonly #loadedAt: number
  readonly #roles: ReadonlyMap<string, readonly string[]>

  /**
   * @param roles Every member's roles, keyed by member number, with no empty lists.
   * @param loadedAt When the map was read, in milliseconds.
   */
  constructor(roles: ReadonlyMap<string, readonly string[]>, loadedAt: number) {
    this.#roles = roles
    this.#loadedAt = loadedAt
  }

  /**
   * One member's roles. A member the map does not list gets the service's `DEFAULT_ROLES`,
   * which the environment leaves empty – so no roles at all.
   * @param memberNo The member number read from the identity claims, if one was found.
   * @returns A copy of the roles.
   */
  rolesFor(memberNo: string | undefined): string[] {
    return [...((memberNo === undefined ? undefined : this.#roles.get(memberNo)) ?? [])]
  }

  /**
   * The cache's state, as the health check reports it.
   * @returns How many members hold roles, when the map was read in seconds, and whether it
   *   has never loaded.
   */
  status(): { readonly last_refresh: number; readonly members: number; readonly stale: boolean } {
    return { members: this.#roles.size, last_refresh: this.#loadedAt / 1000, stale: false }
  }
}

/**
 * Finds the Scoutnet member number in ScoutID's claims: `scoutnet_member_no` or one of its
 * obvious spellings, then the number in a `scoutnet|` or `scoutnet@` username, then the
 * subject, which never matches the map and is there only so the lookup key is stable.
 * @param claims ScoutID's identity claims.
 * @returns The member number, or undefined when no claim can stand in for one.
 */
export function memberNoFromClaims(claims: Claims): string | undefined {
  for (const name of ["scoutnet_member_no", "member_no", "memberNo", "member_number"]) {
    const value = field(claims, name)
    if (typeof value === "string" || typeof value === "number") {
      return String(value)
    }
  }
  const username = claims["preferred_username"]
  if (typeof username === "string") {
    for (const separator of ["|", "@"]) {
      const prefix = `scoutnet${separator}`
      if (username.startsWith(prefix) && username.length > prefix.length) {
        return username.slice(prefix.length)
      }
    }
  }
  const subject = claims["sub"]
  return typeof subject === "string" ? subject : undefined
}
