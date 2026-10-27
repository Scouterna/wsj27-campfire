import type { Role } from "@scouterna/wsj27-campfire-utils"

import { scopeOf, type Case } from "../../../model/Case"
import { profileOf } from "../../../model/CaseType"
import { leaderUnits } from "../../use-people"

/**
 * Who is reading a case, as the rules about its role need them.
 */
export interface Reader {
  /**
   * Their member number, undefined until the session says.
   */
  readonly memberNo: string | undefined
  /**
   * Their roles.
   */
  readonly roles: readonly Role[]
  /**
   * The types the cases service says they may open cases of, undefined while that is on
   * its way – which names the types whose role they hold.
   */
  readonly types: readonly string[] | undefined
}

/**
 * Whether a reader holds the role a case's type needs: for a type bound to a unit, leading
 * that unit, and for any other, the service listing the type among theirs – since the
 * service lists exactly the types their roles give. Mirrors the cases service, which
 * decides it again on every write.
 * @param item The case whose type's role to test.
 * @param reader The reader, with the types the service lists for them.
 * @returns True when they hold the type's role.
 */
function hasTypeRole(item: Case, reader: Reader): boolean {
  const scope = scopeOf(item)
  if (profileOf(scope.type).isUnitBound) {
    return scope.unitNumber !== undefined && leaderUnits(reader.roles).includes(scope.unitNumber)
  }
  return reader.types?.includes(scope.type) ?? false
}

/**
 * Whether the reader counts as one of a case's role holders: they hold its type's role,
 * and on a private case they opened it, since nobody else counts as one there. Someone
 * the case is only shared with is not one.
 * @param item The case to count for.
 * @param reader The reader, with their member number for a private case.
 * @returns True for a role holder.
 */
export function isRoleHolder(item: Case, reader: Reader): boolean {
  if (item.secrecyLevel === 5 && item.creatorMemberNo !== reader.memberNo) {
    return false
  }
  return hasTypeRole(item, reader)
}

/**
 * Whether the reader may change who a case is shared with: one of its role holders, on an
 * open case at a level that can be shared. Someone it is shared with may not pass it on.
 * @param item The case to be shared.
 * @param reader The reader who would share it.
 * @returns True when the service would take the reader's change.
 */
export function canShare(item: Case, reader: Reader): boolean {
  return !item.isClosed && item.secrecyLevel !== 4 && isRoleHolder(item, reader)
}
