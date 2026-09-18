import { fullName, type Participant } from "./Participant"
import type { ParticipantRole } from "./ParticipantRole"
import { funktionName } from "./Participation"

/**
 * The participation role a list can be narrowed to, as the address carries it and as the
 * chips offer it – in the chips' own order. "cmt" is the contingent management, spelled
 * the way the chip and the query parameter spell it rather than the way the role does.
 */
export type RoleFilter = "deltagare" | "ledare" | "ist" | "cmt"

// Everything Unicode calls a combining mark. Stripping them after an NFD decomposition
// is what lets "Asa" find "Åsa" and "Hallstrom" find "Hällström" – a reader typing on a
// phone keyboard should not have to produce the diacritic to find the person.
const combining = /\p{Diacritic}/gu

// A table rather than a cast: only the management's spelling actually differs, and a
// lookup keeps the two vocabularies from being assumed equal anywhere else.
const rolesByFilter: ReadonlyMap<RoleFilter, ParticipantRole> = new Map([
  ["cmt", "kontingentledning"],
  ["deltagare", "deltagare"],
  ["ist", "ist"],
  ["ledare", "ledare"],
])

/**
 * One string reduced to what a search compares: case folded, diacritics removed.
 * @param value The string to reduce.
 * @returns The folded string.
 */
function fold(value: string): string {
  return value.normalize("NFD").replaceAll(combining, "").toLowerCase()
}

/* eslint-disable unicorn/consistent-boolean-name -- `matches(person, query)` reads as the
predicate it is at every call site, which an `is`-prefixed spelling of the same thing does
not */
/**
 * The register that says what a unit is called, where anything does – the identity
 * register's own shape, taken as a parameter because unit names are presentation-owned
 * runtime data this model cannot import.
 */
export type UnitNameLookup = (unitNumber: number) => string | undefined

/**
 * Whether a person answers a search.
 *
 * The query is tested against the full name, the unit's name, and the management
 * member's funktion, each separately – never joined, so a query cannot match across the
 * seam between two fields. A query that is only digits is a unit number and matches it
 * exactly – "2" finds Avdelning 2, never 28. The member number and the plain role words
 * stay out: the chips narrow by role, and a search that matched "ist" would be a second,
 * accidental filter. An empty query, or one that is only whitespace, matches everybody.
 * @param person The person to test.
 * @param query What the reader typed.
 * @param nameOf What a unit is called, where the identities know – nothing known when
 * left out.
 * @returns True when the person answers the query.
 */
export function matches(person: Participant, query: string, nameOf?: UnitNameLookup): boolean {
  const needle = fold(query.trim())
  if (needle === "") {
    return true
  }
  if (/^\d+$/u.test(needle)) {
    return person.unitNumber !== undefined && String(person.unitNumber) === needle
  }
  if (fold(fullName(person)).includes(needle)) {
    return true
  }
  const unitName = person.unitNumber === undefined ? undefined : nameOf?.(person.unitNumber)
  if (unitName !== undefined && fold(unitName).includes(needle)) {
    return true
  }
  return person.funktion !== undefined && fold(funktionName(person.funktion)).includes(needle)
}
/* eslint-enable unicorn/consistent-boolean-name */

/**
 * The people a search text and a role filter leave, applied together.
 *
 * The role narrows first, because it is the cheaper test, and the search runs over what
 * is left. Order is the caller's: this filters and never re-sorts, so a list handed in
 * in reading order comes back in reading order.
 * @param people The people to narrow.
 * @param query What the reader typed. Empty or whitespace narrows nothing.
 * @param roll The role to keep, or undefined to keep every role.
 * @param nameOf What a unit is called, where the identities know – nothing known when
 * left out.
 * @returns The people that answer both, in the order they arrived.
 */
export function narrow(
  people: readonly Participant[],
  query: string,
  roll: RoleFilter | undefined,
  nameOf?: UnitNameLookup,
): readonly Participant[] {
  const role = roll === undefined ? undefined : rolesByFilter.get(roll)
  const byRole = role === undefined ? people : people.filter((person) => person.role === role)
  return query.trim() === "" ? byRole : byRole.filter((person) => matches(person, query, nameOf))
}
