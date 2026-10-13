import { istPatrolNumbered } from "./IstPatrol"
import type { Participant } from "./Participant"
import { funktionName, type CmtFunktion } from "./Participation"
import { unitNumbered } from "./Unit"

/**
 * The kinds of group the contingent is divided into: the units, the IST, and the
 * contingent management.
 */
export type GroupKind = "avdelningar" | "cmt" | "ist"

/**
 * The kinds of group, in the order the groups view lists them.
 */
export const groupKinds: readonly GroupKind[] = ["avdelningar", "ist", "cmt"]

/**
 * One row of the groups view: a numbered unit, an IST patrol, the IST outside every
 * patrol, or one funktion of the contingent management.
 */
export interface GroupEntry {
  /**
   * What the entry's address carries – a unit number, `"ist-"` and a patrol number,
   * `"ist"`, or `"cmt-"` and a funktion.
   */
  readonly key: string
  /**
   * What the row reads: "Avdelning N", "IST-patrull N", "IST utan patrull", or the
   * funktion's name.
   */
  readonly label: string
  /**
   * How many people the entry holds, within the viewer's scope.
   */
  readonly count: number
  /**
   * The kind of group the entry is, which decides the card it is listed on.
   */
  readonly kind: GroupKind
  /**
   * What the unit or the IST patrol is called – "Björnen", "Tordyvel". Absent for every
   * other entry, and for a number the contingent has not named.
   */
  readonly name?: string
}

/**
 * One group's people, resolved from its key.
 */
export interface Group {
  /**
   * The group's label, so the screen behind a key can title itself without re-deriving
   * it.
   */
  readonly label: string
  /**
   * The people the group holds, in the order they were handed in.
   */
  readonly people: readonly Participant[]
}

// The IST outside every patrol, which is no numbered entry.
const istKey = "ist"

// The management members the roster has not detailed, who close the management's part.
const undetailed = "ovriga"

// The head of contingent leads, then the funktioner alphabetically by their labels, and
// the undetailed members close the list.
const funktionOrder: readonly CmtFunktion[] = [
  "kontingentledare",
  "administration",
  "avdelningssupport",
  "halsosupport",
  "istSupport",
  "kommunikation",
  "program",
  "support",
]

/**
 * The unit a groups view key names, or undefined for any other key.
 * @param key The key an entry carries.
 * @returns The unit's number, or undefined when the key names no unit.
 */
export function unitNumberOf(key: string): number | undefined {
  return /^\d+$/u.test(key) ? Number(key) : undefined
}

/**
 * The IST patrol a groups view key names, or undefined for any other key.
 * @param key The key an entry carries.
 * @returns The patrol's number, or undefined when the key names no IST patrol.
 */
export function istPatrolOf(key: string): number | undefined {
  const digits = /^ist-(\d+)$/u.exec(key)?.[1]
  return digits === undefined ? undefined : Number(digits)
}

/**
 * Where a management key sits in the management's order – a funktion's rank, or the
 * undetailed members' after them all.
 * @param key The key an entry carries.
 * @returns The rank, or undefined when the key names no part of the management.
 */
function cmtRankOf(key: string): number | undefined {
  const segment = /^cmt-(.+)$/u.exec(key)?.[1]
  if (segment === undefined) {
    return undefined
  }
  if (segment === undetailed) {
    return funktionOrder.length
  }
  // Widened, because the segment arrived from an address and is any string at all.
  const funktions: readonly string[] = funktionOrder
  const rank = funktions.indexOf(segment)
  return rank === -1 ? undefined : rank
}

/**
 * Where an entry is listed: its kind, and its rank within that kind – a unit or a patrol by
 * its number, the IST outside every patrol after the patrols, and the management by
 * funktion.
 * @param key The key an entry carries.
 * @returns The kind and the rank, or undefined when the key names no entry.
 */
function positionOf(key: string): { kind: GroupKind; rank: number } | undefined {
  const unitNumber = unitNumberOf(key)
  if (unitNumber !== undefined) {
    return { kind: "avdelningar", rank: unitNumber }
  }
  const patrol = istPatrolOf(key)
  if (patrol !== undefined) {
    return { kind: "ist", rank: patrol }
  }
  if (key === istKey) {
    return { kind: "ist", rank: Number.MAX_SAFE_INTEGER }
  }
  const cmtRank = cmtRankOf(key)
  return cmtRank === undefined ? undefined : { kind: "cmt", rank: cmtRank }
}

/**
 * What an entry key is called – the label its row reads.
 * @param key The key an entry carries.
 * @returns The label, or undefined when the key names no entry.
 */
export function groupLabelOf(key: string): string | undefined {
  const position = positionOf(key)
  switch (position?.kind) {
    case undefined: {
      return undefined
    }
    case "avdelningar": {
      return `Avdelning ${String(position.rank)}`
    }
    case "ist": {
      return key === istKey ? "IST utan patrull" : `IST-patrull ${String(position.rank)}`
    }
    case "cmt": {
      const funktion = funktionOrder[position.rank]
      return funktion === undefined ? "Övriga" : funktionName(funktion)
    }
  }
}

/**
 * What the unit or the IST patrol an entry key names is called.
 * @param key The key an entry carries.
 * @returns The name, or undefined for any other key and for a number the contingent has
 *   not named.
 */
function nameOf(key: string): string | undefined {
  const unitNumber = unitNumberOf(key)
  if (unitNumber !== undefined) {
    return unitNumbered(unitNumber).name
  }
  const patrol = istPatrolOf(key)
  return patrol === undefined ? undefined : istPatrolNumbered(patrol).name
}

/**
 * The key of the entry a person is in. A unit's key is its number and an IST patrol's is
 * prefixed, because the patrols are numbered in the same series as the units.
 * @param person The person to place.
 * @returns The key, or undefined for a deltagare or a ledare placed in no unit.
 */
function groupKeyOf(person: Participant): string | undefined {
  switch (person.role) {
    case "ist": {
      return person.istPatrol === undefined ? istKey : `ist-${String(person.istPatrol.number)}`
    }
    case "kontingentledning": {
      return `cmt-${person.funktion ?? undetailed}`
    }
    case "deltagare":
    case "ledare": {
      return person.unit === undefined ? undefined : String(person.unit.number)
    }
  }
}

/**
 * The groups view's rows, derived from the people already assembled – browsing costs no
 * request.
 *
 * The units come first, ascending, then the IST patrols, ascending, with the IST outside
 * every patrol after them, then the contingent management by funktion. An entry appears
 * only when it holds somebody, so a viewer who may read one unit sees one row. Everyone
 * the participants service placed is in exactly one entry, so the counts add up to the
 * whole list; a deltagare or a ledare the service placed in no unit belongs to no entry,
 * which is the one way the sum can fall short.
 * @param people The assembled people, in any order.
 * @returns The entries, in the order the groups view lists them.
 */
export function groupEntries(people: readonly Participant[]): readonly GroupEntry[] {
  const counts = new Map<string, number>()
  for (const person of people) {
    const key = groupKeyOf(person)
    if (key !== undefined) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const entries: { entry: GroupEntry; rank: number }[] = []
  for (const [key, count] of counts) {
    const position = positionOf(key)
    const label = groupLabelOf(key)
    if (position !== undefined && label !== undefined) {
      const name = nameOf(key)
      entries.push({
        entry: { count, key, kind: position.kind, label, ...(name !== undefined && { name }) },
        rank: position.rank,
      })
    }
  }
  return entries
    .toSorted(
      (left, right) =>
        groupKinds.indexOf(left.entry.kind) - groupKinds.indexOf(right.entry.kind) ||
        left.rank - right.rank,
    )
    .map(({ entry }) => entry)
}

/**
 * The people behind one of the groups view's keys, and what that group is called.
 * @param people The assembled people, in any order.
 * @param key The key an entry carries – a unit number, `"ist-"` and a patrol number,
 *   `"ist"`, or `"cmt-"` and a funktion.
 * @returns The group's label and people, or undefined when no group has that key –
 * which is the same answer for a key nobody is in and for a key that is not one.
 */
export function findGroup(people: readonly Participant[], key: string): Group | undefined {
  const entry = groupEntries(people).find((candidate) => candidate.key === key)
  if (entry === undefined) {
    return undefined
  }
  return { label: entry.label, people: people.filter((person) => groupKeyOf(person) === key) }
}
