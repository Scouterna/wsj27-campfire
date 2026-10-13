import { allHoldersOf, capitalized, holdersOf, type CaseScope, type CaseType } from "./CaseType"
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
  readonly type: CaseType
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
 * The scope a case was opened in – its type, and for a unit's case the unit.
 * @param item The case.
 * @returns The scope.
 */
export function scopeOf(item: Case): CaseScope {
  return item.type === "avdelning" && /^\d+$/u.test(item.troop)
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
 * Whether a case may be shared with someone, and would let them in – never anyone who sees
 * it already, and only the people the case is closest to:
 *
 * - A unit's case stays within its unit: the unit's other leaders, and only while it is
 *   private, since otherwise they see it already.
 * - A CMT case goes to the leaders of the unit its person is in, since all of CMT sees it
 *   already – and while it is private, to the rest of CMT as well.
 * - A health case goes to any leader or member of CMT, the only people the cases service
 *   lets open a case at all. Who holds the health team's role is not in the list of
 *   participants, so nobody offered can be known to see it already.
 * @param item The case.
 * @param person Someone it could be shared with.
 * @returns True when the case may be shared with them.
 */
export function canBeSharedWith(item: Case, person: Person): boolean {
  const scope = scopeOf(item)
  const isUnitLeader =
    person.role === "ledare" &&
    unitOfCase(item) !== undefined &&
    unitNumberOf(person) === unitOfCase(item)
  if (scope.type === "avdelning") {
    return item.secrecyLevel === 5 && isUnitLeader
  }
  if (scope.type === "cmt") {
    return isUnitLeader || (item.secrecyLevel === 5 && person.role === "kontingentledning")
  }
  return person.role === "ledare" || person.role === "kontingentledning"
}
