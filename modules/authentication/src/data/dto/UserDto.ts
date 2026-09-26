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
 * Decodes the auth service's identity answer into the signed-in user. The payload
 * crosses a service boundary, so a shape this module does not recognize decodes to
 * nothing rather than crashing the gate. A session is useless without a name and a
 * role list, and everything else degrades to an empty string.
 * @param payload The body the identity question answered with.
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
  // The cast is safe because every field past this line is read defensively, so a shape
  // the service never promised decodes to undefined rather than lying about a type.
  const record = user as Record<string, unknown>
  const name = record["name"]
  const spellings = record["roles"]
  if (typeof name !== "string" || !isArray(spellings)) {
    return undefined
  }
  const givenName = stringOrFallback(record["givenName"])
  // A non-string entry grants nothing, like a spelling the vocabulary does not know.
  const roles = spellings.flatMap((spelling) =>
    typeof spelling === "string" ? toRoles(spelling) : [],
  )
  const leaderUnitNumber = leaderUnit(roles)
  const unit = leaderUnitNumber === undefined ? undefined : { number: leaderUnitNumber }
  const mark = markFor(roles, unit)

  return {
    // The given name the provider sent, or the full name's first word when it sent none,
    // and an empty name greets nobody rather than crashing.
    firstName: givenName === "" ? (name.trim().split(/\s+/u, 1)[0] ?? "") : givenName,
    memberNo: stringOrFallback(record["memberNo"]),
    name,
    roleLine: roleLineFor(roles),
    roleLineWithUnit: roleLineWithUnitFor(roles, unit),
    roles,
    // Spread rather than assigned, because `exactOptionalPropertyTypes` holds an absent
    // unit to a missing key rather than a key holding undefined.
    ...(mark !== undefined && { mark }),
    ...(unit !== undefined && { unit }),
  }
}
