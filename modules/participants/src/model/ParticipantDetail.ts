import type { ContactDetails } from "./ContactDetails"
import type { Experience } from "./Experience"
import type { HealthProfile } from "./HealthProfile"
import type { LanguageSkill } from "./LanguageSkill"
import type { Note } from "./Note"
import type { Participant } from "./Participant"
import type { Travel } from "./Participation"
import type { Readiness } from "./Readiness"

/**
 * One person in full: their own fields, and everything they answered when they signed up.
 * A list carries none of this beyond the addresses it mails – it is fetched only when
 * somebody is opened.
 *
 * A section whose field is absent is not rendered. Absent means the same whatever the
 * reason – not asked on their form, not answered, or not the viewer's to see – so a
 * screen never has to caveat what it does not show.
 */
export interface ParticipantDetail extends Participant {
  /**
   * How they travel to the jamboree. The contingent management has none.
   */
  readonly travel?: Travel
  /**
   * The name on their ID card, when it differs from the one the list of participants
   * carries – deltagare and IST only, and only when given.
   */
  readonly idCardName?: string
  /**
   * How to reach them and the people around them.
   */
  readonly contact: ContactDetails
  /**
   * What they declared about their health – absent for a viewer who may not read it.
   */
  readonly health?: HealthProfile
  /**
   * The languages they graded.
   */
  readonly languages?: readonly LanguageSkill[]
  /**
   * How ready they are for the jamboree's activities.
   */
  readonly readiness?: Readiness
  /**
   * What they have done before that the jamboree resembles.
   */
  readonly experience?: Experience
  /**
   * What they wrote to the unit leader and to the contingent management.
   */
  readonly notes: readonly Note[]
}
