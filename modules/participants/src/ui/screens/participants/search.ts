import type { RoleFilter } from "../../../model/narrowing"

/**
 * The narrowing the address carries, so a narrowed list can be linked to, restored by a
 * history pop, and reloaded into the same view. `q` is the search text and `roll` the
 * role chip in force; both absent is the clean list.
 */
export type ParticipantsSearch = {
  /**
   * The search text, trimmed and never empty – an empty search is an absent key rather
   * than a `q=` hanging off the address.
   */
  readonly q?: string
  /**
   * The role the list is narrowed to. Absent is "Alla", which is every role.
   */
  readonly roll?: RoleFilter
}

// The four the chips offer, as a set rather than a list: this is a membership test on a
// value that arrived from outside, which is the one thing the type system cannot do.
const filters: ReadonlySet<string> = new Set<RoleFilter>(["cmt", "deltagare", "ist", "ledare"])

/**
 * Whether an untyped value is one of the role filters.
 * @param value The value the address carried.
 * @returns True when it names a filter.
 */
function isRoleFilter(value: unknown): value is RoleFilter {
  return typeof value === "string" && filters.has(value)
}

/**
 * The narrowing an address actually carries, read back from whatever is in its search
 * params.
 *
 * Nothing is trusted: an address is hand-typed, bookmarked from an older build, or
 * pasted between people, so anything that is not a usable search text or one of the four
 * role filters is dropped rather than carried into the screen. The worst a stale address
 * can do is open the clean list.
 * @param search The search params the router parsed out of the address.
 * @returns The narrowing to apply, with every unusable part left out.
 */
export function toParticipantsSearch(search: Record<string, unknown>): ParticipantsSearch {
  const q = search["q"]
  const roll = search["roll"]
  const text = typeof q === "string" ? q.trim() : ""

  return {
    ...(text !== "" && { q: text }),
    ...(isRoleFilter(roll) && { roll }),
  }
}
