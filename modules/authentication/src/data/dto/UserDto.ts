import { leaderUnit, stringOrFallback, type User } from "@scouterna/wsj27-campfire-utils"

import { markFor, roleLineFor, roleLineWithUnitFor } from "../../model/User"
import { toRoles } from "./RoleDto"

/**
 * Whether an untyped value is an array, narrowed to unknown members. `Array.isArray`
 * alone narrows to `any[]`, which would let every read past it lie about what it found.
 * @param value The untyped value to check.
 * @returns True when the value is an array.
 */
function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

/**
 * Defensive by design: the payload crosses a service boundary, so a shape this module
 * does not recognize reads as signed out rather than as a crash in the gate. A name and
 * a role list are the two things a session is useless without; everything else degrades
 * to an empty string.
 * @param payload The body `/api/auth/user` answered with.
 * @returns The user, or undefined when the payload is not one.
 */
export function decodeUser(payload: unknown): User | undefined {
  if (typeof payload !== "object" || payload === null || !("user" in payload)) {
    return undefined
  }
  const { user } = payload
  if (typeof user !== "object" || user === null) {
    return undefined
  }
  // The cast is honest: past this line every field is read defensively, so a shape the
  // service never promised still decodes to undefined rather than lying about a type.
  const record = user as Record<string, unknown>
  const name = record["name"]
  const spellings = record["roles"]
  if (typeof name !== "string" || !isArray(spellings)) {
    return undefined
  }
  const givenName = stringOrFallback(record["givenName"])
  // Translated here and nowhere else: a spelling the vocabulary does not know grants
  // nothing, and a non-string entry is dropped the same way.
  const roles = spellings.flatMap((spelling) =>
    typeof spelling === "string" ? toRoles(spelling) : [],
  )
  const leaderUnitNumber = leaderUnit(roles)
  const unit = leaderUnitNumber === undefined ? undefined : { number: leaderUnitNumber }
  const mark = markFor(roles, unit)

  return {
    // The greeting name, derived once here: the given name the provider sent, or the
    // full name's first word when it sent none – an empty name greets nobody rather
    // than crashing.
    firstName: givenName === "" ? (name.trim().split(/\s+/u, 1)[0] ?? "") : givenName,
    memberNo: stringOrFallback(record["memberNo"]),
    name,
    roleLine: roleLineFor(roles),
    roleLineWithUnit: roleLineWithUnitFor(roles, unit),
    roles,
    // Spread rather than assigned: an absent unit is a missing key, not a key holding
    // undefined, which is the distinction `exactOptionalPropertyTypes` holds the code to.
    ...(mark !== undefined && { mark }),
    ...(unit !== undefined && { unit }),
  }
}
