import {
  allHoldersOf,
  capitalized,
  holdersOf,
  profileOf,
  type CaseScope,
  type ShareAudience,
} from "./CaseType"
import { nameOf, unitNumberOf, type People, type Person } from "./Person"
import type { SecrecyLevel } from "./SecrecyLevel"

/**
 * A case kept about one person – a title, the notes written on it, who it reaches, and
 * whether it is still being followed up.
 */
export interface Case {
  /**
   * The member number of the person the case is about, absent for a case about nobody in
   * particular.
   */
  readonly aboutMemberNo?: string
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
   * When the case was opened, which is what the list orders by.
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
   * When the newest note was written, absent before the first.
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
   * The unit a unit's case belongs to, and for any other case the unit of the person it
   * is about – empty for somebody without one.
   */
  readonly troop: string
  /**
   * What the case is kept for, which decides whose role reaches it.
   */
  readonly type: string
}

/**
 * Who a case is about, by name – the member number while the names are loading or for
 * somebody the list of participants does not hold, and a sentence of its own for a case
 * the service holds about nobody in particular.
 * @param item The case to name the subject of.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @returns The words to show for the case's subject.
 */
export function aboutName(item: Case, people: People | undefined): string {
  return item.aboutMemberNo === undefined
    ? "Ingen person angiven"
    : nameOf(people, item.aboutMemberNo)
}

/**
 * When something last happened on a case – its newest note, or its opening before the
 * first – which is what a list of cases to act on orders by.
 * @param item The case.
 * @returns The moment.
 */
export function lastActivity(item: Case): Date {
  return item.latestNoteAt ?? item.createdAt
}

/**
 * Cases ordered by when something last happened on them, the latest first.
 * @param cases The cases.
 * @returns The same cases, ordered.
 */
export function byLastActivity(cases: readonly Case[]): readonly Case[] {
  return cases.toSorted(
    (left, right) => lastActivity(right).getTime() - lastActivity(left).getTime(),
  )
}

/**
 * The scope a case was opened in – its type, and for a type bound to a unit the unit.
 * @param item The case.
 * @returns The scope.
 */
export function scopeOf(item: Case): CaseScope {
  return profileOf(item.type).isUnitBound && /^\d+$/u.test(item.troop)
    ? { type: item.type, unitNumber: Number(item.troop) }
    : { type: item.type }
}

/**
 * Who sees a case, in a sentence – "Hela hälsoteamet ser ärendet." or "Bara du ser
 * ärendet."
 * @param item The case.
 * @param readerMemberNo The reader's own member number, so a private case of theirs says
 * so to them.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @returns The sentence.
 */
export function whoSees(
  item: Case,
  readerMemberNo: string | undefined,
  people: People | undefined,
): string {
  const scope = scopeOf(item)
  if (item.secrecyLevel === 3) {
    return `${capitalized(allHoldersOf(scope))} ser ärendet.`
  }
  if (item.secrecyLevel === 4) {
    return `Bara ${holdersOf(scope)} ser ärendet, och det kan inte delas.`
  }
  return item.creatorMemberNo === readerMemberNo
    ? "Bara du ser ärendet."
    : `Bara ${nameOf(people, item.creatorMemberNo)} ser ärendet.`
}

/**
 * The unit a case is filed under – a unit's own case's unit, and for any other case the
 * unit of the person it is about.
 * @param item The case.
 * @returns The unit number, or undefined for a case about somebody without one.
 */
export function unitOfCase(item: Case): number | undefined {
  return /^\d+$/u.test(item.troop) ? Number(item.troop) : undefined
}

/**
 * Who a case may be shared with as it stands – while it is private to its creator, or while
 * it is open to its type's role – as its type's profile says.
 * @param item The case.
 * @returns The people it may go to, by who they are to it.
 */
export function shareAudiencesOf(item: Case): readonly ShareAudience[] {
  const { sharesWith } = profileOf(item.type)
  return item.secrecyLevel === 5 ? sharesWith.private : sharesWith.open
}

/**
 * Whether a case may be shared with someone, and would let them in – never anyone who sees
 * it already, and only the people its type's profile names: any leader, a leader of the
 * case's own unit, or anyone in CMT.
 * @param item The case.
 * @param person Someone it could be shared with.
 * @returns True when the case may be shared with them.
 */
export function canBeSharedWith(item: Case, person: Person): boolean {
  const unit = unitOfCase(item)
  return shareAudiencesOf(item).some((audience) => {
    if (audience === "cmt") {
      return person.role === "kontingentledning"
    }
    if (audience === "leaders") {
      return person.role === "ledare"
    }
    return person.role === "ledare" && unit !== undefined && unitNumberOf(person) === unit
  })
}
