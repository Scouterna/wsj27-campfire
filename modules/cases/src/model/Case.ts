import { nameOf, type People } from "./Person"

/**
 * A case the health team keeps about one person – a title, the notes written on it, and
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
   * What the case is about, in a line.
   */
  readonly title: string
  /**
   * The unit number of the person the case is about, empty for somebody without one.
   */
  readonly troop: string
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
