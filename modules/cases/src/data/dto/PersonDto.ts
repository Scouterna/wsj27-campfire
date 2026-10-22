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
  readonly roles?: unknown
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

// The function segment of a `wsj27:cmt:<function>:<roll>` role, in the product's words. The
// support function is split by its roll into its subgroups, and a support roll that names
// none is the support function itself. A segment a later roster invents maps to nothing
// rather than a guess.
const funktionsBySegment: ReadonlyMap<string, string> = new Map([
  ["admin", "Admin"],
  ["hoc", "HoC"],
  ["kommunikation", "Kommunikation"],
  ["program", "Program"],
])

const funktionsBySupportRoll: ReadonlyMap<string, string> = new Map([
  ["avdelningssupport", "Avdelningssupport"],
  ["halsa", "Hälsosupport"],
  ["ist-support", "IST-support"],
])

/**
 * The function of the contingent management the minted roles place somebody in. The
 * service sends the roles with a row at the basic level and leaves them off at the name
 * level, so a reader who sees only names never learns a function.
 * @param roles The row's `roles` field, as the service sent it.
 * @returns The function's words, or undefined where the roles name none.
 */
function toFunktion(roles: unknown): string | undefined {
  if (!Array.isArray(roles)) {
    return undefined
  }
  for (const role of roles) {
    const [prefix, kind, segment = "", roll = ""] = typeof role === "string" ? role.split(":") : []
    if (prefix !== "wsj27" || kind !== "cmt") {
      continue
    }
    const funktion =
      segment === "support"
        ? (funktionsBySupportRoll.get(roll) ?? "Support")
        : funktionsBySegment.get(segment)
    if (funktion !== undefined) {
      return funktion
    }
  }
  return undefined
}

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
  const funktion = role === "kontingentledning" ? toFunktion(dto.roles) : undefined

  return {
    ...(funktion !== undefined && { funktion }),
    memberNo,
    name,
    ...(role !== undefined && { role }),
    ...(troop !== "" && { troop }),
  }
}

/**
 * Every readable row of the listings, each person once, since a leader appears in the
 * leaders' listing as well as in their unit's. A person's rows are merged rather than the
 * last one kept, because a name-level row carries no unit and must not take away the one
 * another row gave them.
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
      people.set(person.memberNo, { ...people.get(person.memberNo), ...person })
    }
  }
  return people
}
