/**
 * The role vocabulary – the closed set of roles the application knows, and the helpers
 * every screen asks with. Nothing here knows a provider or a wire format – translating
 * a provider's spellings into this set is the data layer's job, in the module that owns
 * the session.
 */

/**
 * A role the signed-in person holds, from a closed set, so a spelling the application
 * does not know grants none.
 */
// Grouped rather than alphabetical – the leader role, then the cmt umbrella, then the
// management functions under it in alphabetical order.
export type Role =
  | { readonly kind: "leader"; readonly unitNumber?: number }
  | { readonly kind: "cmt" }
  | { readonly kind: "admin" }
  | { readonly kind: "communication" }
  | { readonly kind: "headOfContingent" }
  | { readonly kind: "health" }
  | { readonly kind: "istSupport" }
  | { readonly kind: "program" }
  | { readonly kind: "unitSupport" }

/**
 * Whether the held roles carry at least one of the given kinds.
 * @param roles The roles held.
 * @param kinds The kinds to look for.
 * @returns True when any of the kinds is held, so false when no kinds are given.
 */
export function hasAnyRole(roles: readonly Role[], ...kinds: readonly Role["kind"][]): boolean {
  return kinds.some((kind) => roles.some((role) => role.kind === kind))
}

/**
 * Whether the held roles carry every one of the given kinds.
 * @param roles The roles held.
 * @param kinds The kinds that must all be held.
 * @returns True when every kind is held, so true when no kinds are given.
 */
export function hasAllRoles(roles: readonly Role[], ...kinds: readonly Role["kind"][]): boolean {
  return kinds.every((kind) => roles.some((role) => role.kind === kind))
}

/**
 * The unit a leader among the held roles leads.
 * @param roles The roles held.
 * @returns The unit number, or undefined when nobody holds the leader role or no
 * leader role carries a readable unit.
 */
export function leaderUnit(roles: readonly Role[]): number | undefined {
  // A set can hold both an unnumbered leader role and a unit-scoped one, and the unit
  // must win, so this finds the first leader role that carries one.
  const leader = roles.find(
    (role): role is Extract<Role, { kind: "leader" }> =>
      role.kind === "leader" && role.unitNumber !== undefined,
  )
  return leader?.unitNumber
}
