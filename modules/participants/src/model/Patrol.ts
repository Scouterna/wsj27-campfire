import type { Gender } from "./Gender"
import { ageOf, type Participant } from "./Participant"

/**
 * How many patrols a unit is divided into.
 */
const patrolCount = 4

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
   * saved under its place's own name. Never fewer than a unit is divided into.
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
 * Whether a person belongs in a unit's patrols. Only a deltagare does, because the
 * service stores a patrol for nobody else, so a value entered by hand on a ledare must
 * neither open a place in the draft nor ask for a write the service refuses.
 * @param person The person to ask about.
 * @returns True for a deltagare.
 */
export function isPatrolMember(person: Participant): boolean {
  return person.role === "deltagare"
}

/**
 * The place a stored name belongs in, if it has one: where it stood before, or, for a
 * name that is a place's own, that place – "Patrull 2" is the second – because a patrol
 * nobody named reads back under that name, and anywhere else would leave an unnamed
 * place going by the same one.
 * @param name The stored name.
 * @param earlier The names by place, as they stood before.
 * @returns The place, or undefined for any place.
 */
function placeOfName(name: string, earlier: readonly string[]): number | undefined {
  const at = earlier.indexOf(name)
  if (at !== -1) {
    return at
  }
  const own = /^patrull ([1-9]\d*)$/u.exec(name.trim().toLocaleLowerCase("sv"))?.[1]
  return own === undefined ? undefined : Number(own) - 1
}

/**
 * The arrangement the unit already has, as a draft to start from. A patrol takes the
 * place its name belongs in, the others take what is left in alphabetical order, and the
 * places left over are unnamed – so a unit nobody has divided starts from empty patrols.
 * A unit whose people name more patrols than a unit is divided into gets a place for every
 * one of them, because dropping one would move people out of it without anybody asking.
 * @param people The unit's people, in any order.
 * @param earlier The names by place as the leader last saw them, so a save does not
 *   shuffle the patrols under them. Empty on a first look.
 * @returns The draft.
 */
export function draftOf(
  people: readonly Participant[],
  earlier: readonly string[] = [],
): PatrolDraft {
  const members = people.filter((person) => isPatrolMember(person))
  const named = [
    ...new Set(members.map((person) => person.patrol).filter((name) => name !== undefined)),
  ].toSorted((left, right) => swedish.compare(left, right))
  const length = Math.max(patrolCount, named.length, earlier.length)
  const names = Array.from({ length }, () => "")
  const unhoused: string[] = []
  for (const name of named) {
    const place = placeOfName(name, earlier)
    if (place !== undefined && names.at(place) === "") {
      // eslint-disable-next-line security/detect-object-injection -- a place is a number the code computed
      names[place] = name
    } else {
      unhoused.push(name)
    }
  }
  for (const name of unhoused) {
    names[names.indexOf("")] = name
  }
  const placements = new Map<string, number>()
  for (const person of members) {
    if (person.patrol !== undefined) {
      placements.set(person.memberNo, names.indexOf(person.patrol))
    }
  }
  return { names, placements }
}

/**
 * The name a patrol's place gives it while it has none of its own.
 * @param index The patrol's place.
 * @returns The name, counted from one.
 */
export function placeName(index: number): string {
  return `Patrull ${String(index + 1)}`
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
  return given === "" ? placeName(index) : given
}

/**
 * What every patrol is called, in place order.
 * @param draft The arrangement.
 * @returns The names, as `patrolName` gives them.
 */
export function patrolNames(draft: PatrolDraft): readonly string[] {
  return draft.names
    .keys()
    .map((index) => patrolName(draft, index))
    .toArray()
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
 * The scouts in one patrol, or in none, in the order they were handed in, since nobody
 * else can be placed.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param index The patrol's place, or undefined for the people in none.
 * @returns The scouts there.
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
 * The place to put a person following a stored name: the patrol going by it, or else an
 * empty unnamed place, or else a new one. Mutates what it is handed, because the caller
 * is building a draft up.
 * @param names The names by place.
 * @param placements Who is where.
 * @param name The stored name.
 * @returns The place.
 */
function placeFor(names: string[], placements: Map<string, number>, name: string): number {
  const named = patrolNames({ names, placements }).indexOf(name)
  if (named !== -1) {
    return named
  }
  const taken = new Set(placements.values())
  const empty = names.findIndex((given, index) => given.trim() === "" && !taken.has(index))
  const place = empty === -1 ? names.length : empty
  // eslint-disable-next-line security/detect-object-injection -- a place is a number the code computed
  names[place] = name
  return place
}

/**
 * A leader's draft carried over a change in what is stored, so somebody else's save never
 * reads as a change of theirs to write back. A person whose stored patrol moved follows
 * it, unless the leader moved them too, or renamed their patrol, which touches everybody
 * in it. Then the leader's arrangement stands.
 * @param draft The arrangement, as it stood against `from`.
 * @param from The people the draft was made against.
 * @param people The people as the service last sent them.
 * @returns A new draft.
 */
export function rebased(
  draft: PatrolDraft,
  from: readonly Participant[],
  people: readonly Participant[],
): PatrolDraft {
  const before = new Map(from.map((person) => [person.memberNo, person.patrol]))
  const names = [...draft.names]
  const placements = new Map(draft.placements)
  for (const person of people) {
    const { memberNo, patrol } = person
    const was = before.get(memberNo)
    const index = placements.get(memberNo)
    const isTouched = (index === undefined ? undefined : patrolName(draft, index)) !== was
    if (isPatrolMember(person) && patrol !== was && !isTouched) {
      if (patrol === undefined) {
        placements.delete(memberNo)
      } else {
        placements.set(memberNo, placeFor(names, placements, patrol))
      }
    }
  }
  return { names, placements }
}

/**
 * The people with the saved writes applied, so a list shows what was saved without
 * asking the service again. A person no write names is handed back as they were.
 * @param people The people as the service last sent them.
 * @param writes The writes the service accepted.
 * @returns A new list, in the same order.
 */
export function withPatrols<Person extends Participant>(
  people: readonly Person[],
  writes: readonly PatrolWrite[],
): readonly Person[] {
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
    const copy: { -readonly [Key in keyof Person]: Person[Key] } = { ...person }
    delete copy.patrol
    return copy
  })
}

/**
 * What a leader weighs a patrol by: how full it is and who it mixes.
 */
export interface PatrolStats {
  /**
   * The patrol's scouts, counted by gender. A gender nobody has is absent.
   */
  readonly genders: ReadonlyMap<Gender, number>
  /**
   * How many scouts it holds.
   */
  readonly scouts: number
}

/**
 * The figures a patrol is weighed by.
 * @param scouts The patrol's scouts.
 * @returns The figures.
 */
export function patrolStats(scouts: readonly Participant[]): PatrolStats {
  const genders = new Map<Gender, number>()
  for (const { gender } of scouts) {
    if (gender !== undefined) {
      genders.set(gender, (genders.get(gender) ?? 0) + 1)
    }
  }
  return {
    genders,
    scouts: scouts.length,
  }
}

/**
 * The draft with the scouts in no patrol dealt out over the patrols, leaving everybody
 * already placed where they are, so that each patrol fills evenly and mixes as much as it
 * can – each scout goes to the patrol with the fewest people, and of their gender, their
 * scoutkår, and their age, already in it, and none past its even share. The kårer with the
 * most scouts are dealt first, so they are split before the patrols fill.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param today The moment the scouts' ages are counted at.
 * @param random A number in [0, 1), which breaks ties so that two deals differ.
 * @returns A new draft.
 */
export function dealtOut(
  people: readonly Participant[],
  draft: PatrolDraft,
  today: Date,
  random: () => number = Math.random,
): PatrolDraft {
  const scouts = people.filter((person) => isPatrolMember(person))
  const placements = new Map(draft.placements)
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

  const slots = draft.names.keys().toArray()
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
   * What tells the section from another under the same heading, because a leader can name
   * a patrol anything, "Utan patrull" included.
   */
  readonly id: string
  /**
   * The heading – the patrol's name, or "Utan patrull" for the people in none.
   */
  readonly label: string
  /**
   * The scouts in it, in the order they were handed in.
   */
  readonly people: readonly Participant[]
}

/**
 * A unit's scouts partitioned by patrol, for the grouped lists: a section per patrol
 * anybody is in, alphabetically, and the scouts in none closing as "Utan patrull". Empty
 * for a unit nobody has divided, which a list shows ungrouped instead.
 * @param people The unit's people, in the order each section should keep.
 * @returns The non-empty sections, in reading order. The leaders are in none of them.
 */
export function patrolSections(people: readonly Participant[]): readonly PatrolSection[] {
  const draft = draftOf(people)
  if (draft.placements.size === 0) {
    return []
  }
  const sections = draft.names
    .keys()
    .map((index): PatrolSection => ({
      id: `patrol-${String(index)}`,
      label: patrolName(draft, index),
      people: membersOf(people, draft, index),
    }))
    .toArray()
    .toSorted((left, right) => swedish.compare(left.label, right.label))
  const unplaced: PatrolSection = {
    id: "unplaced",
    label: "Utan patrull",
    people: membersOf(people, draft, undefined),
  }
  return [...sections, unplaced].filter((section) => section.people.length > 0)
}
