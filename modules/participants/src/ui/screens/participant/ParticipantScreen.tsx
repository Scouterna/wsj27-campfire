import { PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Experience } from "../../../model/Experience"
import { fullName } from "../../../model/Participant"
import type { Readiness } from "../../../model/Readiness"
import { ContactSection } from "./ContactSection"
import { DietSection } from "./DietSection"
import { ExperienceSection } from "./ExperienceSection"
import { HealthSection } from "./HealthSection"
import { LanguagesSection } from "./LanguagesSection"
import { ProfileSection } from "./ProfileSection"
import { ReadinessSection } from "./ReadinessSection"
import { useParticipant } from "./use-participant"
import { VaccinationsSection } from "./VaccinationsSection"

import "./ParticipantScreen.css"

export interface ParticipantScreenProps {
  /**
   * Whose record to show – the member number the address's `$memberNo` parameter carries.
   */
  readonly memberNo: string
}

/**
 * What the chrome calls the page before the person's name is known. Kept through the
 * failure state too, because a page that could not be read has no better name.
 */
const pendingTitle = "Deltagare"

/**
 * Whether a readiness block says anything a tile or a quote could draw.
 * @param readiness The readiness to weigh.
 * @returns True where at least one of the three answers arrived.
 */
function hasAnswers(readiness: Readiness): boolean {
  return (
    readiness.swims200m !== undefined ||
    readiness.comfortableInCrowds !== undefined ||
    readiness.clarification !== undefined
  )
}

/**
 * Whether an experience block carries either of its two facts.
 * @param experience The experience to weigh.
 * @returns True where at least one fact arrived.
 */
function hasFacts(experience: Experience): boolean {
  return (
    experience.internationalScouting !== undefined || experience.independentTravel !== undefined
  )
}

/**
 * One person in full: one screen for all four roles, drawing the sections whose data
 * arrived and nothing for the rest, so the per-role variation falls out of the record
 * rather than out of a branch.
 *
 * The chrome titles the screen with the person's name the moment the record arrives –
 * `PageTitle` is how the screen tells it.
 * @param props Whose record to show.
 * @returns The screen.
 */
export function ParticipantScreen(props: ParticipantScreenProps): ReactElement {
  const { error, isPending, participant } = useParticipant(props.memberNo)

  if (isPending) {
    return (
      <>
        <PageTitle title={pendingTitle} />
        <p role="status">Hämtar personen …</p>
      </>
    )
  }

  if (error !== null || participant === undefined) {
    // One wording for every failure. A member number nobody holds and one outside the
    // viewer's scope are deliberately not told apart – the service answers both the same
    // way on purpose, and saying which it was would leak who exists. There is nothing to
    // retry either: a second ask gets the same 403 or 404. An expired session never lands
    // here – the query client asks who is signed in, and the gate shows sign-in instead.
    return (
      <>
        <PageTitle title={pendingTitle} />
        <p role="status">Personen kunde inte visas.</p>
      </>
    )
  }

  const health = participant.health
  const readiness =
    participant.readiness !== undefined && hasAnswers(participant.readiness)
      ? participant.readiness
      : undefined
  const languages =
    participant.languages !== undefined && participant.languages.length > 0
      ? participant.languages
      : undefined
  const experience =
    participant.experience !== undefined && hasFacts(participant.experience)
      ? participant.experience
      : undefined

  return (
    <>
      <PageTitle title={fullName(participant)} />

      <div className="person">
        <ProfileSection participant={participant} />
        <ContactSection contact={participant.contact} />
        {health !== undefined && <DietSection health={health} />}
        <HealthSection health={health} notes={participant.notes} />

        {(readiness ?? health ?? languages) !== undefined && (
          <div className="person-pair">
            {readiness !== undefined && <ReadinessSection readiness={readiness} />}
            {health !== undefined && <VaccinationsSection vaccinations={health.vaccinations} />}
            {languages !== undefined && <LanguagesSection languages={languages} />}
          </div>
        )}

        {experience !== undefined && <ExperienceSection experience={experience} />}
      </div>
    </>
  )
}
