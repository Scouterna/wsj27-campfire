import type { SecrecyLevel } from "./SecrecyLevel"

/**
 * One entry in a case's history – what somebody who reaches the case wrote, and when.
 */
export interface Note {
  /**
   * The member number of whoever wrote the note.
   */
  readonly authorMemberNo: string
  /**
   * The identifier of the case the note belongs to.
   */
  readonly caseId: string
  /**
   * When the note was written, which is what the notes order by.
   */
  readonly createdAt: Date
  /**
   * The service's identifier.
   */
  readonly id: string
  /**
   * Who may read the note – its case's level, or a higher one that hides it from some of
   * those who reach the case.
   */
  readonly secrecyLevel: SecrecyLevel
  /**
   * What was written.
   */
  readonly text: string
  /**
   * The heading the note was written under. This module writes its case's title there,
   * and the service takes any.
   */
  readonly title: string
}
