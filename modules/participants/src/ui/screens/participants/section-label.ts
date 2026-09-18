import { hasAnyRole, type Role } from "@scouterna/wsj27-campfire-utils"

/**
 * What the participants section is called for these roles. One source for the words,
 * because the application's menu and this module's screens must agree.
 *
 * The management's name wins over the leader's: somebody who leads a unit and also
 * serves in the contingent management reads the whole contingent, so calling their
 * section "Min avdelning" would name it after the smaller of the two lists they are
 * actually given.
 * @param roles The signed-in person's roles.
 * @returns "Min avdelning" for a leader who is only a leader, otherwise "Deltagare".
 */
export function participantsSectionLabel(roles: readonly Role[]): string {
  if (hasAnyRole(roles, "cmt")) {
    return "Deltagare"
  }
  return hasAnyRole(roles, "leader") ? "Min avdelning" : "Deltagare"
}
