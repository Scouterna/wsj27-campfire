import { hasAnyRole, type Role } from "@scouterna/wsj27-campfire-utils"

import { scopeOf, type Case } from "../model/Case"
import { leaderUnits } from "./use-people"

/**
 * Whether a set of roles holds the role a case's type needs – the health team's for a
 * health case, any management role for a management case, and a leader of its unit for a
 * unit's case. Mirrors the cases service, which decides it again on every write.
 * @param item The case.
 * @param roles The reader's roles.
 * @returns True when the roles hold the type's role.
 */
function hasTypeRole(item: Case, roles: readonly Role[]): boolean {
  const scope = scopeOf(item)
  if (scope.type === "hälsa") {
    return hasAnyRole(roles, "health")
  }
  if (scope.type === "cmt") {
    return hasAnyRole(roles, "cmt")
  }
  return scope.unitNumber !== undefined && leaderUnits(roles).includes(scope.unitNumber)
}

/**
 * Whether the reader counts as one of a case's role holders: they hold its type's role,
 * and on a private case they opened it, since nobody else counts as one there. Someone
 * the case is only shared with is not one.
 * @param item The case.
 * @param roles The reader's roles.
 * @param memberNo The reader's member number.
 * @returns True for a role holder.
 */
export function isRoleHolder(
  item: Case,
  roles: readonly Role[],
  memberNo: string | undefined,
): boolean {
  if (item.secrecyLevel === 5 && item.creatorMemberNo !== memberNo) {
    return false
  }
  return hasTypeRole(item, roles)
}

/**
 * Whether the reader may change who a case is shared with: one of its role holders, on an
 * open case at a level that can be shared. Someone it is shared with may not pass it on.
 * @param item The case.
 * @param roles The reader's roles.
 * @param memberNo The reader's member number.
 * @returns True when the service would take the reader's change.
 */
export function canShare(
  item: Case,
  roles: readonly Role[],
  memberNo: string | undefined,
): boolean {
  return !item.isClosed && item.secrecyLevel !== 4 && isRoleHolder(item, roles, memberNo)
}
