import type { Gender } from "./Gender"
import { ageOf, type Participant } from "./Participant"

/**
 * How many patrols a unit is divided into.
 */
export const patrolCount = 4

/**
 * How many scouts a patrol holds when the unit is full.
 */
export const patrolSize = 9

/**
 * A unit's patrols as a leader is arranging them, before anything is saved: what each
 * patrol is called, and who is in which. A patrol is known by its place in the list, so
 * renaming one moves nobody out of it.
 */
export interface PatrolDraft {
  /**
   * What each patrol is called, as typed – empty for one nobody has named, which is
   * saved under its place's own name. Never fewer than the unit's four.
   */
  readonly names: readonly string[]
  /**
   * The patrol each placed person is in, by member number, as an index into `names`.
   * Anybody not here is in no patrol.
   */
  readonly placements: ReadonlyMap<string, number>
}

/**
 * One person's patrol as it has to be written: the patrol's name, or null to take them
 * out of the one they were in.
 */
export interface PatrolWrite {
  /**
   * Whose patrol changes.
   */
  readonly memberNo: string
  /**
   * The name to store, or null to store none.
   */
  readonly patrol: string | null
}

// Constructed once, because a collator is expensive to build and free to reuse.
const swedish = new Intl.Collator("sv")

/**
 * Whether a person belongs in a unit's patrols – its scouts, and its leaders, who each
 * lead a patrol of their own.
 * @param person The person to ask about.
 * @returns True for a deltagare or a ledare.
 */
export function isPatrolMember(person: Participant): boolean {
  return person.role === "deltagare" || person.role === "ledare"
}

/**
 * The arrangement the unit already has, as a draft to start from. The patrols the
 * people are in take the first places, in alphabetical order, and the places left over
 * are unnamed – so a unit nobody has divided starts from four empty patrols. A unit
 * whose people name more than four patrols gets a place for every one of them, because
 * dropping one would move people out of it without anybody asking.
 * @param people The unit's people, in any order.
 * @returns The draft.
 */
export function draftOf(people: readonly Participant[]): PatrolDraft {
  const members = people.filter((person) => isPatrolMember(person))
  const named = [
    ...new Set(members.map((person) => person.patrol).filter((name) => name !== undefined)),
  ].toSorted((left, right) => swedish.compare(left, right))
  const names = [...named, ...Array.from({ length: patrolCount - named.length }, () => "")]
  const placements = new Map<string, number>()
  for (const person of members) {
    if (person.patrol !== undefined) {
      placements.set(person.memberNo, named.indexOf(person.patrol))
    }
  }
  return { names, placements }
}

/**
 * What a patrol is called – its given name, or its place's own, "Patrull 2", while it
 * has none. The name a patrol is saved under, and the one every screen shows.
 * @param draft The arrangement.
 * @param index The patrol's place.
 * @returns The name.
 */
export function patrolName(draft: PatrolDraft, index: number): string {
  const given = draft.names.at(index)?.trim() ?? ""
  return given === "" ? `Patrull ${String(index + 1)}` : given
}

/**
 * The draft with one person moved – into a patrol, between two, or out of the one they
 * were in.
 * @param draft The arrangement.
 * @param memberNo Who moves.
 * @param index The patrol they move to, or undefined for none.
 * @returns A new draft.
 */
export function moved(
  draft: PatrolDraft,
  memberNo: string,
  index: number | undefined,
): PatrolDraft {
  const placements = new Map(draft.placements)
  if (index === undefined) {
    placements.delete(memberNo)
  } else {
    placements.set(memberNo, index)
  }
  return { ...draft, placements }
}

/**
 * The draft with several people moved together – the same as moving each of them.
 * @param draft The arrangement.
 * @param memberNos Who moves.
 * @param index The patrol they move to, or undefined for none.
 * @returns A new draft.
 */
export function movedAll(
  draft: PatrolDraft,
  memberNos: Iterable<string>,
  index: number | undefined,
): PatrolDraft {
  let next = draft
  for (const memberNo of memberNos) {
    next = moved(next, memberNo, index)
  }
  return next
}

/**
 * Who leads a patrol – the unit's leader placed in it. Undefined while it has none.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param index The patrol's place.
 * @returns The leader, or undefined.
 */
export function leaderOf(
  people: readonly Participant[],
  draft: PatrolDraft,
  index: number,
): Participant | undefined {
  return people.find(
    (person) => person.role === "ledare" && draft.placements.get(person.memberNo) === index,
  )
}

/**
 * The draft with a patrol given a leader, or none. A leader who already leads another
 * patrol trades places with the one they replace, so once every patrol has a leader,
 * choosing one for a patrol swaps two of them rather than leaving the other patrol
 * without.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param index The patrol's place.
 * @param memberNo The leader to give it, or undefined to leave it without one.
 * @returns A new draft.
 */
export function withLeader(
  people: readonly Participant[],
  draft: PatrolDraft,
  index: number,
  memberNo: string | undefined,
): PatrolDraft {
  const replaced = people
    .filter((person) => person.role === "ledare" && draft.placements.get(person.memberNo) === index)
    .map((person) => person.memberNo)
    .filter((replacedNo) => replacedNo !== memberNo)
  if (memberNo === undefined) {
    return movedAll(draft, replaced, undefined)
  }
  const from = draft.placements.get(memberNo)
  return moved(movedAll(draft, replaced, from), memberNo, index)
}

/**
 * The draft with one patrol given a new name. Kept as typed, so the field under the
 * leader's fingers is not trimmed while they type.
 * @param draft The arrangement.
 * @param index The patrol's place.
 * @param name The name, as typed.
 * @returns A new draft.
 */
export function renamed(draft: PatrolDraft, index: number, name: string): PatrolDraft {
  return { ...draft, names: draft.names.map((current, at) => (at === index ? name : current)) }
}

/**
 * The people in one patrol, or in none, in the order they were handed in – the unit's
 * scouts and leaders alone, since nobody else can be placed.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param index The patrol's place, or undefined for the people in none.
 * @returns The people there.
 */
export function membersOf(
  people: readonly Participant[],
  draft: PatrolDraft,
  index: number | undefined,
): readonly Participant[] {
  return people.filter(
    (person) => isPatrolMember(person) && draft.placements.get(person.memberNo) === index,
  )
}

/**
 * The names that two patrols share, compared as a reader would – without case or the
 * spaces around them. Saving under a shared name would merge the two, since a patrol is
 * stored as nothing but its name on each of its people.
 * @param draft The arrangement.
 * @returns Every name in use more than once, as the first patrol spells it.
 */
export function sharedNames(draft: PatrolDraft): readonly string[] {
  const seen = new Map<string, string>()
  const shared = new Set<string>()
  for (const index of draft.names.keys()) {
    const name = patrolName(draft, index)
    const folded = name.toLocaleLowerCase("sv")
    const first = seen.get(folded)
    if (first === undefined) {
      seen.set(folded, name)
    } else {
      shared.add(first)
    }
  }
  return [...shared]
}

/**
 * What saving the draft has to write: one entry for every person whose patrol would
 * read differently afterwards, and nobody else – a renamed patrol writes each of its
 * people, and an untouched one writes nobody.
 * @param people The unit's people, as the service last sent them.
 * @param draft The arrangement.
 * @returns The writes, in the order the people were handed in.
 */
export function patrolWrites(
  people: readonly Participant[],
  draft: PatrolDraft,
): readonly PatrolWrite[] {
  const writes: PatrolWrite[] = []
  for (const person of people) {
    if (!isPatrolMember(person)) {
      continue
    }
    const index = draft.placements.get(person.memberNo)
    const patrol = index === undefined ? undefined : patrolName(draft, index)
    if (patrol !== person.patrol) {
      // eslint-disable-next-line unicorn/no-null -- the service takes null to store no patrol
      writes.push({ memberNo: person.memberNo, patrol: patrol ?? null })
    }
  }
  return writes
}

/**
 * The people with the saved writes applied, so a list shows what was saved without
 * asking the service again. A person no write names is handed back as they were.
 * @param people The people as the service last sent them.
 * @param writes The writes the service accepted.
 * @returns A new list, in the same order.
 */
export function withPatrols(
  people: readonly Participant[],
  writes: readonly PatrolWrite[],
): readonly Participant[] {
  const byMemberNo = new Map(writes.map((write) => [write.memberNo, write.patrol]))
  return people.map((person) => {
    const patrol = byMemberNo.get(person.memberNo)
    if (patrol === undefined) {
      return person
    }
    if (patrol !== null) {
      return { ...person, patrol }
    }
    // Rebuilt without the key rather than holding undefined, because an absent patrol is
    // a missing key.
    const copy: { -readonly [Key in keyof Participant]: Participant[Key] } = { ...person }
    delete copy.patrol
    return copy
  })
}

/**
 * A point on the map, in degrees.
 */
export interface Coordinates {
  /**
   * Degrees north.
   */
  readonly latitude: number
  /**
   * Degrees east.
   */
  readonly longitude: number
}

/**
 * What a leader weighs a patrol by: how full it is, who it mixes, and how far apart its
 * people live. Every figure but the counts is over the scouts alone, because the adult
 * in a patrol is not who the balance is for.
 */
export interface PatrolStats {
  /**
   * The patrol's scouts, counted by gender. A gender nobody has is absent.
   */
  readonly genders: ReadonlyMap<Gender, number>
  /**
   * The scoutkårer the scouts come from – how many, and the one most of them share.
   */
  readonly groups: {
    readonly count: number
    readonly largest?: { readonly count: number; readonly name: string }
  }
  /**
   * The scouts' ages in whole years, where any is known.
   */
  readonly ages?: {
    readonly average: number
    readonly oldest: number
    readonly youngest: number
  }
  /**
   * The leaders placed in the patrol.
   */
  readonly leaders: readonly Participant[]
  /**
   * How many scouts it holds.
   */
  readonly scouts: number
  /**
   * The average distance between two of its scouts' homes, in kilometers, where at
   * least two of them live somewhere the map can place.
   */
  readonly spreadKm?: number
}

const earthRadiusKm = 6371

/**
 * The distance between two points over the earth's surface, as the crow flies.
 * @param from One point.
 * @param to The other.
 * @returns The distance, in kilometers.
 */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180
  const latitude = radians(to.latitude - from.latitude)
  const longitude = radians(to.longitude - from.longitude)
  const along =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitude / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(along))
}

/**
 * The average distance between every two of a set of points, or undefined for fewer
 * than two.
 * @param points The points.
 * @returns The average, in kilometers.
 */
function averageSpread(points: readonly Coordinates[]): number | undefined {
  let total = 0
  let pairs = 0
  for (const [index, from] of points.entries()) {
    const later = points.slice(index + 1)
    for (const to of later) {
      total += distanceKm(from, to)
      pairs += 1
    }
  }
  return pairs === 0 ? undefined : total / pairs
}

/**
 * The figures a patrol is weighed by.
 * @param members The patrol's people – scouts and leaders alike.
 * @param today The day ages are counted to.
 * @param locate Where a home town is on the map, or undefined for one it cannot place.
 * @returns The figures.
 */
export function patrolStats(
  members: readonly Participant[],
  today: Date,
  locate: (town: string) => Coordinates | undefined,
): PatrolStats {
  const scouts = members.filter((person) => person.role === "deltagare")

  const genders = new Map<Gender, number>()
  for (const { gender } of scouts) {
    if (gender !== undefined) {
      genders.set(gender, (genders.get(gender) ?? 0) + 1)
    }
  }

  const byGroup = new Map<string, number>()
  for (const { memberGroup } of scouts) {
    if (memberGroup !== undefined) {
      byGroup.set(memberGroup, (byGroup.get(memberGroup) ?? 0) + 1)
    }
  }
  const [largest] = [...byGroup].toSorted(
    ([leftName, left], [rightName, right]) => right - left || swedish.compare(leftName, rightName),
  )

  const ages = scouts.map((person) => ageOf(person, today)).filter((age) => age !== undefined)
  const places = scouts
    .map((person) => (person.homeTown === undefined ? undefined : locate(person.homeTown)))
    .filter((place) => place !== undefined)
  const spreadKm = averageSpread(places)

  return {
    genders,
    groups: {
      count: byGroup.size,
      ...(largest !== undefined && { largest: { count: largest[1], name: largest[0] } }),
    },
    ...(ages.length > 0 && {
      ages: {
        average: ages.reduce((sum, age) => sum + age, 0) / ages.length,
        oldest: Math.max(...ages),
        youngest: Math.min(...ages),
      },
    }),
    leaders: members.filter((person) => person.role === "ledare"),
    scouts: scouts.length,
    ...(spreadKm !== undefined && { spreadKm }),
  }
}

/**
 * The draft with scouts dealt out over the patrols so that each patrol fills evenly and
 * mixes as much as it can – each scout goes to the patrol with the fewest people, and of
 * their gender, their scoutkår, and their age, already in it, and none past its even share.
 * The kårer with the most scouts are dealt first, so they are split before the patrols
 * fill. Leaders stay where they are.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param which The unplaced scouts alone, or every scout, starting from empty patrols.
 * @param random A number in [0, 1), which breaks ties so that two deals differ.
 * @returns A new draft.
 */
export function dealtOut(
  people: readonly Participant[],
  draft: PatrolDraft,
  which: "all" | "unplaced",
  random: () => number = Math.random,
): PatrolDraft {
  const today = new Date()
  const scouts = people.filter((person) => person.role === "deltagare")
  const placements = new Map(draft.placements)
  if (which === "all") {
    for (const scout of scouts) {
      placements.delete(scout.memberNo)
    }
  }
  const toDeal = scouts.filter((scout) => !placements.has(scout.memberNo))

  const groupSizes = new Map<string, number>()
  for (const { memberGroup } of toDeal) {
    groupSizes.set(memberGroup ?? "", (groupSizes.get(memberGroup ?? "") ?? 0) + 1)
  }
  const order = toDeal
    .map((scout) => ({ scout, tie: random() }))
    .toSorted(
      (left, right) =>
        (groupSizes.get(right.scout.memberGroup ?? "") ?? 0) -
          (groupSizes.get(left.scout.memberGroup ?? "") ?? 0) || left.tie - right.tie,
    )
    .map(({ scout }) => scout)

  const slots = draft.names.slice(0, patrolCount).keys().toArray()
  const inSlot = (index: number): Participant[] =>
    scouts.filter((scout) => placements.get(scout.memberNo) === index)
  // No patrol takes more than its even share, so the patrols end at most one apart.
  const share = Math.ceil(scouts.length / slots.length)

  for (const scout of order) {
    const age = ageOf(scout, today)
    const scored = slots.map((index) => {
      const there = inSlot(index)
      const mix =
        there.filter((other) => other.gender === scout.gender).length * 2 +
        there.filter((other) => other.memberGroup === scout.memberGroup).length * 3 +
        there.filter((other) => age !== undefined && ageOf(other, today) === age).length
      // Size counts too, so a patrol running behind catches up before the mix is fine-tuned.
      return { cost: there.length * 2 + mix + random(), index, isFull: there.length >= share }
    })
    const open = scored.filter((slot) => !slot.isFull)
    const [best] = (open.length > 0 ? open : scored).toSorted(
      (left, right) => left.cost - right.cost,
    )
    if (best !== undefined) {
      placements.set(scout.memberNo, best.index)
    }
  }
  return { ...draft, placements }
}

/**
 * One patrol's slice of a unit, under its own heading.
 */
export interface PatrolSection {
  /**
   * Marks the people in no patrol, so a screen can tell them from a patrol that happens
   * to share the heading's words. Absent on a patrol.
   */
  readonly isUnplaced?: true
  /**
   * The heading – the patrol's name, or "Utan patrull" for the people in none.
   */
  readonly label: string
  /**
   * The people in it – its leaders first, then its scouts, each in the order they were
   * handed in.
   */
  readonly people: readonly Participant[]
}

/**
 * A unit partitioned by patrol, for the grouped lists: a section per patrol anybody is
 * in, alphabetically, and the scouts and leaders in none closing as "Utan patrull".
 * Empty for a unit nobody has divided, which a list shows ungrouped instead.
 * @param people The unit's people, in the order each section should keep.
 * @returns The non-empty sections, in reading order.
 */
export function patrolSections(people: readonly Participant[]): readonly PatrolSection[] {
  const members = people.filter((person) => isPatrolMember(person))
  const draft = draftOf(members)
  if (draft.placements.size === 0) {
    return []
  }
  const leadersFirst = (group: readonly Participant[]): readonly Participant[] => [
    ...group.filter((person) => person.role === "ledare"),
    ...group.filter((person) => person.role !== "ledare"),
  ]
  const sections = draft.names.keys().map((index): PatrolSection => ({
    label: patrolName(draft, index),
    people: leadersFirst(membersOf(members, draft, index)),
  }))
  const unplaced: PatrolSection = {
    isUnplaced: true,
    label: "Utan patrull",
    people: leadersFirst(membersOf(members, draft, undefined)),
  }
  return [...sections, unplaced].filter((section) => section.people.length > 0)
}
