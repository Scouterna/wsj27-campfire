import {
  allHoldersOf,
  asSeenBy,
  capitalized,
  holdersOf,
  profileOf,
  type CaseScope,
  type ShareAudience,
} from "./CaseType"
import { nameOf, unitNumberOf, type People, type Person } from "./Person"
import type { SecrecyLevel } from "./SecrecyLevel"

/**
 * A case kept about people, a unit, or neither – a title, the notes written on it, who it
 * reaches, and whether it is still being followed up.
 */
export interface Case {
  /**
   * The member numbers of the people the case is about, in the order they were added –
   * none for a case about a unit as a whole, or about nobody in particular.
   */
  readonly aboutMemberNos: readonly string[]
  /**
   * The member number of whoever is responsible for following the case up, absent while
   * nobody is.
   */
  readonly assigneeMemberNo?: string
  /**
   * When the case was closed, absent while it is open.
   */
  readonly closedAt?: Date
  /**
   * The member number of whoever closed the case, absent while it is open.
   */
  readonly closedByMemberNo?: string
  /**
   * When the case was opened, and its last activity until a note is added.
   */
  readonly createdAt: Date
  /**
   * The member number of whoever opened the case.
   */
  readonly creatorMemberNo: string
  /**
   * The member numbers of the people the case is shared with, beyond the type's role.
   */
  readonly extraAccess: readonly string[]
  /**
   * The service's identifier, a string because routes and caches hold it and nothing does
   * arithmetic on it.
   */
  readonly id: string
  /**
   * Whether the case is closed. A closed case takes no new notes until it is reopened.
   */
  readonly isClosed: boolean
  /**
   * When the newest note was written, absent before the first. The service counts every
   * note, one the reader may not read included.
   */
  readonly latestNoteAt?: Date
  /**
   * How far the case reaches beyond its creator, fixed when it was opened.
   */
  readonly secrecyLevel: SecrecyLevel
  /**
   * What the case is about, in a line.
   */
  readonly title: string
  /**
   * The unit a unit's case belongs to, for a case about a unit as a whole that unit, and
   * for any other case the unit of the first person it was opened about – empty for
   * somebody without one. It is set when the case is opened and never follows a change of
   * who the case is about.
   */
  readonly troop: string
  /**
   * What the case is kept for, which decides whose role reaches it.
   */
  readonly type: string
}

/**
 * Who a case is about, by name in a short line – one person, two joined, more as the first
 * and how many besides, the unit for a case about a unit as a whole, and a line of its own
 * for one about nobody in particular. A member number stands in while the names are
 * loading, or for somebody the list of participants does not hold.
 * @param item The case to name the subject of.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @param ownUnit The one unit the reader leads, which a case about it calls the whole unit
 * rather than by its number.
 * @returns The words to show for the case's subject.
 */
export function aboutName(item: Case, people: People | undefined, ownUnit?: number): string {
  const [first, second, ...rest] = item.aboutMemberNos
  if (first === undefined) {
    const unit = unitOfCase(item)
    if (unit === undefined) {
      return "Ingen person angiven"
    }
    return unit === ownUnit ? "Hela avdelningen" : `Avdelning ${String(unit)}`
  }
  if (second === undefined) {
    return nameOf(people, first)
  }
  return rest.length === 0
    ? `${nameOf(people, first)} och ${nameOf(people, second)}`
    : `${nameOf(people, first)} och ${String(rest.length + 1)} till`
}

/**
 * Whether a case is about a unit as a whole – its unit named, and nobody in it.
 * @param item The case to ask about.
 * @returns True for a case about a whole unit.
 */
export function isAboutUnit(item: Case): boolean {
  return item.aboutMemberNos.length === 0 && unitOfCase(item) !== undefined
}

/**
 * When something last happened on a case – its newest note, or its opening before the
 * first – which is what a list of cases to act on orders by. The newest note can be one
 * above the reader's level, so a note they cannot open still moves the case up, dates it,
 * and ends its wait. That is accepted, because it says only that someone is following up
 * a case they already reach.
 * @param item The case to date.
 * @returns The moment – the opening, while nothing has been written.
 */
export function lastActivity(item: Case): Date {
  return item.latestNoteAt ?? item.createdAt
}

/**
 * Cases ordered by when something last happened on them, the latest first.
 * @param cases The cases, in any order.
 * @returns The same cases, ordered.
 */
export function byLastActivity(cases: readonly Case[]): readonly Case[] {
  return cases.toSorted(
    (left, right) => lastActivity(right).getTime() - lastActivity(left).getTime(),
  )
}

/**
 * The scope a case was opened in – its type, and for a type bound to a unit the unit.
 * @param item The case to read the scope from.
 * @returns The scope, with the unit for a unit's case.
 */
export function scopeOf(item: Case): CaseScope {
  return profileOf(item.type).isUnitBound && /^\d+$/u.test(item.troop)
    ? { type: item.type, unitNumber: Number(item.troop) }
    : { type: item.type }
}

/**
 * Who sees a case, in a few words for its summary – "Hela hälsoteamet", "Bara CMT", "Bara
 * du" – and, on a private case shared with others, its creator alone, since the people it
 * is shared with are counted beside them.
 * @param item The case to describe.
 * @param readerMemberNo The reader's own member number, so a private case of theirs says
 * so to them.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @param ownUnit The one unit the reader leads, which the words do not name.
 * @returns The words – the creator's name for a private case that is not the reader's own.
 */
export function seenBy(
  item: Case,
  readerMemberNo: string | undefined,
  people: People | undefined,
  ownUnit?: number,
): string {
  const scope = asSeenBy(scopeOf(item), ownUnit)
  if (item.secrecyLevel === 3) {
    return capitalized(allHoldersOf(scope))
  }
  if (item.secrecyLevel === 4) {
    return `Bara ${holdersOf(scope)}`
  }
  const isOwn = item.creatorMemberNo === readerMemberNo
  const creator = isOwn ? "du" : nameOf(people, item.creatorMemberNo)
  if (item.extraAccess.length === 0) {
    return `Bara ${creator}`
  }
  return isOwn ? "Du" : creator
}

/**
 * How many a case is shared with, in words – "2 ledare" when every one of them is a
 * leader, and otherwise "1 person" or "3 personer".
 * @param memberNos The people it is shared with, by member number.
 * @param people Everyone the module knows, which says who is a leader.
 * @returns The words, or undefined for a case shared with nobody.
 */
export function sharedCount(
  memberNos: readonly string[],
  people: People | undefined,
): string | undefined {
  const count = memberNos.length
  if (count === 0) {
    return undefined
  }
  const isLeaders = memberNos.every((memberNo) => people?.get(memberNo)?.role === "ledare")
  if (isLeaders) {
    return `${String(count)} ledare`
  }
  return count === 1 ? "1 person" : `${String(count)} personer`
}

/**
 * How many hold the role a case's type needs, as the list of participants says – the
 * health team, the whole management team, or a unit's leaders.
 * @param item The case whose role to count.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @returns The count, or undefined while the names are loading, for a type whose holders
 * the list of participants cannot tell, or where it cannot tell for somebody in it.
 */
export function holderCount(item: Case, people: People | undefined): number | undefined {
  if (people === undefined) {
    return undefined
  }
  const scope = scopeOf(item)
  const profile = profileOf(item.type)
  if (profile.isUnitBound) {
    return scope.unitNumber === undefined
      ? undefined
      : people
          .values()
          .filter((person) => person.role === "ledare" && unitNumberOf(person) === scope.unitNumber)
          .toArray().length
  }
  const { holdsRole } = profile
  if (holdsRole === undefined) {
    return undefined
  }
  let count = 0
  for (const person of people.values()) {
    const holds = holdsRole(person)
    if (holds === undefined) {
      return undefined
    }
    if (holds) {
      count += 1
    }
  }
  return count
}

/**
 * The unit a case is filed under – a unit's own case's unit, a case about a unit as a whole
 * that unit, and for any other case the unit of the first person it was opened about.
 * @param item The case to place.
 * @returns The unit number, or undefined for a case about somebody without one.
 */
export function unitOfCase(item: Case): number | undefined {
  return /^\d+$/u.test(item.troop) ? Number(item.troop) : undefined
}

/**
 * The units a case is about now, lowest first – a unit's own case's unit, a case about a
 * unit as a whole that unit, and for any other case the units of the people it is about.
 * Read from the people rather than the case's troop, because the service sets the troop
 * when the case is opened and leaves it as people are added and removed.
 * @param item The case to place.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @returns The unit numbers, none while the names are loading or for people without one.
 */
export function unitsOfCase(item: Case, people: People | undefined): readonly number[] {
  if (profileOf(item.type).isUnitBound || item.aboutMemberNos.length === 0) {
    const unit = unitOfCase(item)
    return unit === undefined ? [] : [unit]
  }
  const units = item.aboutMemberNos
    .map((memberNo) => unitNumberOf(people?.get(memberNo)))
    .filter((unit) => unit !== undefined)
  return [...new Set(units)].toSorted((left, right) => left - right)
}

/**
 * Who a case may be shared with as it stands – while it is private to its creator, or while
 * it is open to its type's role – as its type's profile says.
 * @param item The case to be shared.
 * @returns The people it may go to, by who they are to it.
 */
export function shareAudiencesOf(item: Case): readonly ShareAudience[] {
  const { sharesWith } = profileOf(item.type)
  return item.secrecyLevel === 5 ? sharesWith.private : sharesWith.open
}

/**
 * Whether a case may be shared with someone, and would let them in – never anyone its type's
 * role already lets in, where the list of participants says who holds it, and only the
 * people its type's profile names: any leader, a leader of a unit the case is about, or
 * anyone in CMT.
 * @param item The case to be shared.
 * @param person Someone it could be shared with.
 * @param people Everyone the module knows, which places the people the case is about.
 * @returns True when the case may be shared with them.
 */
export function canBeSharedWith(item: Case, person: Person, people: People | undefined): boolean {
  const profile = profileOf(item.type)
  if (item.secrecyLevel !== 5 && profile.holdsRole?.(person) === true) {
    return false
  }
  const units = unitsOfCase(item, people)
  return shareAudiencesOf(item).some((audience) => {
    if (audience === "cmt") {
      return person.role === "kontingentledning"
    }
    if (audience === "leaders") {
      return person.role === "ledare"
    }
    const unit = unitNumberOf(person)
    return person.role === "ledare" && unit !== undefined && units.includes(unit)
  })
}
