import { groupKinds, type GroupKind } from "../../../model/groups"

/**
 * The filter the groups view's address carries, so it is still in force when the reader
 * comes back from a group. Absent is "Alla", every kind.
 */
export type GroupsSearch = {
  /**
   * The kind of group the view is narrowed to.
   */
  readonly grupp?: GroupKind
}

// The kinds of group, as a set because this is a membership test on a value that arrived
// from outside, which the type system cannot do.
const kinds: ReadonlySet<string> = new Set<GroupKind>(groupKinds)

/**
 * Whether an untyped value is one of the kinds of group.
 * @param value The value the address carried.
 * @returns True when it names a kind.
 */
function isGroupKind(value: unknown): value is GroupKind {
  return typeof value === "string" && kinds.has(value)
}

/**
 * The filter an address actually carries. Anything that is not a kind of group is
 * dropped, so a stale or hand-typed address opens every kind rather than none.
 * @param search The search params the router parsed out of the address.
 * @returns The filter to apply, absent when the address names no kind.
 */
export function toGroupsSearch(search: Record<string, unknown>): GroupsSearch {
  const grupp = search["grupp"]
  return isGroupKind(grupp) ? { grupp } : {}
}
