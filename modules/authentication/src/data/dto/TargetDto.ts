import { leaderUnit } from "@scouterna/wsj27-campfire-utils"

import type { ImpersonationTarget } from "../../model/ImpersonationTarget"
import { toRoles } from "./RoleDto"

/**
 * One listing row as the participants service sends it at the basic level, with only the
 * keys the impersonation picker reads. Every field is `unknown`, because the service is
 * built separately and changes shape.
 */
export interface TargetDto {
  readonly member_no?: unknown
  readonly name?: unknown
  readonly roles?: unknown
  readonly troop?: unknown
}

/**
 * A member number the service sent as a number or as a string of digits.
 * @param value The untyped value the number arrived in.
 * @returns The member number as a string, or undefined when it is not one.
 */
function toMemberNo(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value)
  }
  if (typeof value === "string" && /^\d+$/u.test(value)) {
    return value
  }
  return undefined
}

/**
 * One listing row as somebody to be shown Campfire as, or undefined when the row cannot
 * be one.
 * @param value The row the participants service sent.
 * @returns The person, or undefined when the row has no member number, no name, or no
 * role – the auth service refuses to become anybody without one.
 */
export function toTarget(value: unknown): ImpersonationTarget | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined
  }
  const dto: TargetDto = value

  const memberNo = toMemberNo(dto.member_no)
  const name = typeof dto.name === "string" ? dto.name.trim() : ""
  // Every spelling counts toward whether the person holds a role, the ones this
  // application does not know included, because the auth service counts them too.
  const spellings = Array.isArray(dto.roles)
    ? dto.roles.filter((spelling): spelling is string => typeof spelling === "string")
    : []
  if (memberNo === undefined || name === "" || spellings.length === 0) {
    return undefined
  }

  const roles = spellings.flatMap((spelling) => toRoles(spelling))
  // The role's unit wins over the listing's, as it does for the signed-in person, because
  // the role is the appointment and the listing a reading of it.
  const troop = typeof dto.troop === "string" ? dto.troop.trim() : ""
  const unitNumber = leaderUnit(roles) ?? (/^\d+$/u.test(troop) ? Number(troop) : undefined)

  return {
    firstName: name.split(/\s+/u, 1)[0] ?? name,
    memberNo,
    name,
    roles,
    ...(unitNumber !== undefined && { unit: { number: unitNumber } }),
  }
}

/**
 * Every readable row of the listings, each person once, since a person can appear in more
 * than one listing.
 * @param value The listings' rows, one after the other.
 * @returns The people, in the order they first appeared, with the unreadable rows
 * dropped.
 */
export function toTargets(value: unknown): readonly ImpersonationTarget[] {
  if (!Array.isArray(value)) {
    return []
  }
  const targets = new Map<string, ImpersonationTarget>()
  for (const row of value) {
    const target = toTarget(row)
    if (target !== undefined && !targets.has(target.memberNo)) {
      targets.set(target.memberNo, target)
    }
  }
  return targets.values().toArray()
}
