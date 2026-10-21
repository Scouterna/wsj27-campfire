import type { People, Person, PersonRole } from "../../model/Person"
import { isRecord, toId } from "./validation"

/**
 * One listing row as the participants service sends it at the basic level, with only the
 * keys this module reads. Every field is `unknown`, because the service is built
 * separately and changes shape.
 */
export interface PersonDto {
  readonly member_no?: unknown
  readonly member_type?: unknown
  readonly name?: unknown
  readonly troop?: unknown
}

// Scoutnet's member types, mapped to the domain's roles. A type a later version of the
// service invents maps to nothing rather than to a guess.
const rolesByMemberType: ReadonlyMap<unknown, PersonRole> = new Map([
  ["Avdelningsledare", "ledare"],
  ["Deltagare", "deltagare"],
  ["IST", "ist"],
  ["Kontingentledning", "kontingentledning"],
])

/**
 * One listing row as the module knows it, or undefined when the payload is not one.
 * @param value The row the participants service sent.
 * @returns The person, or undefined when the row has no member number or no name.
 */
export function toPerson(value: unknown): Person | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const dto: PersonDto = value

  const memberNo = toId(dto.member_no)
  const name = typeof dto.name === "string" ? dto.name.trim() : ""
  if (memberNo === undefined || name === "") {
    return undefined
  }

  // The service sends an empty troop for anybody without a unit, which is absence rather
  // than a unit with no number.
  const troop = typeof dto.troop === "string" ? dto.troop.trim() : ""

  const role = rolesByMemberType.get(dto.member_type)

  return {
    memberNo,
    name,
    ...(role !== undefined && { role }),
    ...(troop !== "" && { troop }),
  }
}

/**
 * Every readable row of the listings, each person once, since a leader appears in the
 * leaders' listing as well as in their unit's.
 * @param value The listings' rows, one after the other.
 * @returns Everyone, keyed by member number, with the unreadable rows dropped.
 */
export function toPeople(value: unknown): People {
  const people = new Map<string, Person>()
  if (!Array.isArray(value)) {
    return people
  }
  for (const row of value) {
    const person = toPerson(row)
    if (person !== undefined) {
      people.set(person.memberNo, person)
    }
  }
  return people
}
