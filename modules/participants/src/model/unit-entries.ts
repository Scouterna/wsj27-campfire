import type { Participant } from "./Participant"
import { funktionName, type CmtFunktion } from "./Participation"

/**
 * One row of the unit browser: a numbered unit, the IST, or the contingent management.
 */
export interface UnitEntry {
  /**
   * What the entry's address carries – a unit number, `"ist"`, or `"cmt"`.
   */
  readonly key: string
  /**
   * What the row reads: "Avdelning N", "IST", or "CMT".
   */
  readonly label: string
  /**
   * How many people the entry holds, within the viewer's scope.
   */
  readonly count: number
}

/**
 * One entry's people, resolved from its key.
 */
export interface UnitGroup {
  /**
   * The entry's label, so the screen behind a key can title itself without re-deriving
   * it.
   */
  readonly label: string
  /**
   * The people the entry holds, in the order they were handed in.
   */
  readonly people: readonly Participant[]
}

const istEntry = { key: "ist", label: "IST" }
const cmtEntry = { key: "cmt", label: "CMT" }

/**
 * Whether a key names the entry a person is in. A numeric key is a unit number, and the
 * word keys are the member types that belong to no unit.
 * @param person The person to place.
 * @param key The key an entry carries.
 * @returns True when that entry holds them.
 */
function isInEntry(person: Participant, key: string): boolean {
  if (key === istEntry.key) {
    return person.role === "ist"
  }
  if (key === cmtEntry.key) {
    return person.role === "kontingentledning"
  }
  return person.unitNumber !== undefined && String(person.unitNumber) === key
}

/**
 * The unit browser's rows, derived from the people already assembled – browsing costs no
 * request.
 *
 * Units come first, ascending, then the IST, then the contingent management. An entry
 * appears only when it holds somebody, so a viewer who may read one unit sees one row.
 * Everyone the participants service placed is in exactly one entry, so the counts add up
 * to the whole list; a deltagare or a ledare the service placed in no unit belongs to no
 * entry, which is the one way the sum can fall short.
 * @param people The assembled people, in any order.
 * @returns The entries, in the order the browser lists them.
 */
export function unitEntries(people: readonly Participant[]): readonly UnitEntry[] {
  const counts = new Map<number, number>()
  let ist = 0
  let cmt = 0
  for (const person of people) {
    if (person.role === "ist") {
      ist += 1
    } else if (person.role === "kontingentledning") {
      cmt += 1
    } else if (person.unitNumber !== undefined) {
      counts.set(person.unitNumber, (counts.get(person.unitNumber) ?? 0) + 1)
    }
  }

  const units = [...counts]
    .toSorted(([left], [right]) => left - right)
    .map(([unitNumber, count]) => ({
      key: String(unitNumber),
      label: `Avdelning ${String(unitNumber)}`,
      count,
    }))

  return [
    ...units,
    ...(ist > 0 ? [{ ...istEntry, count: ist }] : []),
    ...(cmt > 0 ? [{ ...cmtEntry, count: cmt }] : []),
  ]
}

/**
 * The people behind one of the browser's keys, and what that entry is called.
 * @param people The assembled people, in any order.
 * @param key The key an entry carries – a unit number, `"ist"`, or `"cmt"`.
 * @returns The entry's label and people, or undefined when no entry holds that key –
 * which is the same answer for a key nobody is in and for a key that is not one.
 */
export function unitGroup(people: readonly Participant[], key: string): UnitGroup | undefined {
  const entry = unitEntries(people).find((candidate) => candidate.key === key)
  if (entry === undefined) {
    return undefined
  }
  return { label: entry.label, people: people.filter((person) => isInEntry(person, key)) }
}

/**
 * One funktion's slice of the contingent management, under its own heading.
 */
export interface CmtSection {
  /**
   * The heading over the group – the funktion's label, or "Övriga" for the members the
   * roster has not detailed.
   */
  readonly label: string
  /**
   * The members serving in it, in the order they arrived.
   */
  readonly people: readonly Participant[]
}

// The head of contingent leads, then the funktioner alphabetically by their labels, and
// "Övriga" closes the list.
const sectionOrder: readonly CmtFunktion[] = [
  "kontingentledare",
  "administration",
  "avdelningssupport",
  "halsosupport",
  "istSupport",
  "kommunikation",
  "program",
]

/**
 * The contingent management partitioned by funktion, for the grouped view. A funktion
 * nobody serves in gets no section, and order within a section is the caller's, because
 * this never re-sorts.
 * @param people The management's members.
 * @returns The non-empty sections, in reading order.
 */
export function cmtSections(people: readonly Participant[]): readonly CmtSection[] {
  const sections = sectionOrder.map((funktion) => ({
    label: funktionName(funktion),
    people: people.filter((person) => person.funktion === funktion),
  }))
  const undetailed = people.filter((person) => person.funktion === undefined)
  return [...sections, { label: "Övriga", people: undetailed }].filter(
    (section) => section.people.length > 0,
  )
}
