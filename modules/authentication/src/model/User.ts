import { hasAnyRole, type Role, type Unit, type UserMark } from "@scouterna/wsj27-campfire-utils"

/**
 * The derivations the decode fills the signed-in person in with – how they read, and
 * the mark they wear. The `User` itself is `utils`' to define, because every module
 * may ask who is signed in, but its words and marks are decided here.
 */

/**
 * What each management function is called, in the order a person holding more than
 * one is named by – the head of contingent first, then alphabetically by kind. The
 * words are the application's, because the role set carries kinds, never labels.
 */
const cmtFunctions: readonly (readonly [Role["kind"], string])[] = [
  ["headOfContingent", "HoC"],
  ["admin", "Admin"],
  ["communication", "Kommunikation"],
  ["health", "Hälsosupport"],
  ["istSupport", "IST-support"],
  ["program", "Program"],
  ["unitSupport", "Avdelningssupport"],
]

/**
 * The line that says what somebody is in the contingent, without any unit on it.
 * @param roles The person's roles.
 * @returns The role line.
 */
export function roleLineFor(roles: readonly Role[]): string {
  if (hasAnyRole(roles, "leader")) {
    return "Ledare"
  }
  if (hasAnyRole(roles, "cmt")) {
    const named = cmtFunctions.find(([kind]) => hasAnyRole(roles, kind))
    return named === undefined ? "CMT" : `CMT · ${named[1]}`
  }
  return "Deltagare"
}

/**
 * The role line with a leader's unit on it – "Ledare · Avdelning 1". Only a leader's
 * unit joins the line; for everybody else it is the role line itself.
 * @param roles The person's roles.
 * @param unit The unit they are placed in, from the roles or the list of participants.
 * @returns The line, for wherever the unit may be shown.
 */
export function roleLineWithUnitFor(roles: readonly Role[], unit: Unit | undefined): string {
  const line = roleLineFor(roles)
  return unit !== undefined && hasAnyRole(roles, "leader")
    ? `${line} · Avdelning ${String(unit.number)}`
    : line
}

/**
 * The mark somebody wears – their unit's first, because the unit is what the
 * application shapes itself around, then the management's.
 * @param roles The person's roles.
 * @param unit The unit they are placed in, from the roles or the list of participants.
 * @returns The mark, or undefined for somebody who wears none.
 */
export function markFor(roles: readonly Role[], unit: Unit | undefined): UserMark | undefined {
  if (unit !== undefined) {
    return { isLeader: hasAnyRole(roles, "leader"), unitNumber: unit.number }
  }
  return hasAnyRole(roles, "cmt") ? { isLeader: false } : undefined
}
