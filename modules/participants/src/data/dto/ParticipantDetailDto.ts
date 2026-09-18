import { stringOrFallback } from "@scouterna/wsj27-campfire-utils"

import type { ContactDetails, ContactPerson, EmergencyContact } from "../../model/ContactDetails"
import type { Experience } from "../../model/Experience"
import type { Note } from "../../model/Note"
import type { ParticipantDetail } from "../../model/ParticipantDetail"
import type { Travel } from "../../model/Participation"
import type { Readiness } from "../../model/Readiness"
import { answer, flattenAnswers, type Answers } from "./answers"
import { toHealthProfile } from "./HealthProfileDto"
import { toParticipant, type ParticipantDto } from "./ParticipantDto"
import { isRecord } from "./validation"

/**
 * One person in full, as `GET /api/project/participants/individual/{memberNo}` sends them:
 * the basic block, the travel package the service normalizes for them, the contact answers
 * (`contact_info`, basic access), and the health and dietary answers (`forms_data`, health
 * access – absent for a caller without it, and for a `basic` fetch).
 */
export interface ParticipantDetailDto extends ParticipantDto {
  readonly contact_info?: unknown
  readonly forms_data?: unknown
  readonly participation_type?: unknown
}

// The travel packages the participants service normalizes the registration's three
// questions into, mapped to the domain's. The contingent management carries the empty
// string, and a package a later registration invents is no travel at all rather than a
// label the screens would have to guess a word for.
const travelByLabel: ReadonlyMap<string, Travel> = new Map([
  ["Direktresa", "direktresa"],
  ["Egen resa", "egenResa"],
  ["Rundresa", "rundresa"],
])

/**
 * One person as the domain knows them, or undefined when the payload is not a person this
 * module recognizes. The caller turns that into the screen's "could not be shown" state –
 * unlike a list, there is nothing else left to show.
 *
 * The answers arrive as the applicant gave them – Swedish labels, "Ja"/"Nej" gates, graded
 * severities – nested the way the registration form was laid out. Everything here reads
 * the flattened answers by their stable question keys, so the form's layout can change
 * without this module noticing.
 *
 * Two of the domain's fields have no question behind them in the template the service
 * publishes, so nothing fills them: the ID-card name and the graded languages. They stay
 * absent, which the screens already draw as absence. The management's funktion has no
 * question either, but the roster mints it into the record's roles, and the basic
 * converter reads it back out of them.
 * @param dto The record the participants service answered with.
 * @returns The person, or undefined when the payload is not one.
 */
export function toParticipantDetail(dto: ParticipantDetailDto): ParticipantDetail | undefined {
  const base = toParticipant(dto)
  if (base === undefined) {
    return undefined
  }

  const answers = flattenAnswers(dto.contact_info, dto.forms_data)
  const travel =
    typeof dto.participation_type === "string"
      ? travelByLabel.get(dto.participation_type)
      : undefined
  const readiness = toReadiness(answers)
  const experience = toExperience(answers)
  return {
    ...base,
    ...(travel !== undefined && { travel }),
    contact: toContactDetails(dto, answers),
    // The health block exists exactly when the service sent `forms_data` – a viewer
    // without health access, or a basic fetch, gets a person without one, and the screens
    // render nothing rather than a caveat.
    ...(isRecord(dto.forms_data) && { health: toHealthProfile(answers) }),
    ...(readiness !== undefined && { readiness }),
    ...(experience !== undefined && { experience }),
    notes: toNotes(answers),
  }
}

/**
 * A "Ja"/"Nej" gate as a boolean. Anything else – a question the form never asked this
 * person, one they skipped, a spelling a later registration invents – is no answer, which
 * is a third state the screens draw differently from a no.
 * @param value The answer as the applicant gave it.
 * @returns True, false, or undefined when the question was not answered.
 */
function yesOrNo(value: string | undefined): boolean | undefined {
  if (value === "Ja") {
    return true
  }
  return value === "Nej" ? false : undefined
}

/**
 * How ready somebody is for the jamboree's activities – the two exported factors and the
 * free text that qualifies a no. Undefined when none of the three was answered, so a
 * person the questions were never put to renders no section rather than an empty one.
 * @param answers The flattened answers.
 * @returns The readiness, or undefined when nothing was answered.
 */
function toReadiness(answers: Answers): Readiness | undefined {
  const swims200m = yesOrNo(answer(answers, "canSwim200m"))
  // eslint-disable-next-line no-secrets/no-secrets -- a question key, not a secret
  const comfortableInCrowds = yesOrNo(answer(answers, "comfortableInLargeCrowds"))
  const clarification = answer(answers, "activityPrerequisitesDetails")
  if (swims200m === undefined && comfortableInCrowds === undefined && clarification === undefined) {
    return undefined
  }
  return {
    ...(swims200m !== undefined && { swims200m }),
    ...(comfortableInCrowds !== undefined && { comfortableInCrowds }),
    ...(clarification !== undefined && { clarification }),
  }
}

/**
 * One experience: the yes-or-no, and what the person wrote about it. The free text hangs
 * off the gate, so a description without an answer behind it cannot reach the screens.
 * @param answers The flattened answers.
 * @param gateKey The question key that asks whether they have the experience.
 * @param detailsKey The question key that asks them to describe it.
 * @returns The fact, or undefined when the gate was not answered.
 */
function toFact(
  answers: Answers,
  gateKey: string,
  detailsKey: string,
): Experience["internationalScouting"] {
  const has = yesOrNo(answer(answers, gateKey))
  if (has === undefined) {
    return undefined
  }
  const details = answer(answers, detailsKey)
  return { has, ...(details !== undefined && { details }) }
}

/**
 * What somebody has done before that the jamboree resembles. Undefined when neither
 * question was answered.
 * @param answers The flattened answers.
 * @returns The experience, or undefined when nothing was answered.
 */
function toExperience(answers: Answers): Experience | undefined {
  const internationalScouting = toFact(
    answers,
    "hasInternationalScoutingExperience",
    "internationalScoutingExperienceDetails",
  )
  const independentTravel = toFact(
    answers,
    "hasIndependentTravelExperience",
    "independentTravelExperienceDetails",
  )
  if (internationalScouting === undefined && independentTravel === undefined) {
    return undefined
  }
  return {
    ...(internationalScouting !== undefined && { internationalScouting }),
    ...(independentTravel !== undefined && { independentTravel }),
  }
}

/**
 * Contact details from the form's snapshot, backed by the live Scoutnet values in the
 * basic block: the form's email and mobile answers are what the applicant typed at
 * registration, and where they left them out the service's own values stand in.
 * @param dto The record the participants service answered with.
 * @param answers The flattened answers.
 * @returns How to reach them and the people around them.
 */
function toContactDetails(dto: ParticipantDetailDto, answers: Answers): ContactDetails {
  const alternateEmail = answer(answers, "alternateEmail")
  return {
    email: answer(answers, "email") ?? stringOrFallback(dto.email),
    phone: answer(answers, "mobilePhone") ?? stringOrFallback(dto.mobile),
    ...(alternateEmail !== undefined && { alternateEmail }),
    nextOfKin: [
      toContactPerson(answers, "nextOfKin1"),
      toContactPerson(answers, "nextOfKin2"),
    ].filter((person): person is ContactPerson => person !== undefined),
    emergencyContacts: [
      toEmergencyContact(answers, "emergencyContact1", "primary"),
      toEmergencyContact(answers, "emergencyContact2", "secondary"),
    ].filter((contact): contact is EmergencyContact => contact !== undefined),
  }
}

/**
 * A contact exists when their name was given – the other fields follow it.
 * @param answers The flattened answers.
 * @param prefix The question keys' shared prefix, such as `nextOfKin1`.
 * @returns The contact, or undefined when no name was given.
 */
function toContactPerson(answers: Answers, prefix: string): ContactPerson | undefined {
  const name = answer(answers, `${prefix}Name`)
  if (name === undefined) {
    return undefined
  }
  const relation = answer(answers, `${prefix}Relation`)
  const phone = answer(answers, `${prefix}Phone`)
  const email = answer(answers, `${prefix}Email`)
  return {
    name,
    ...(relation !== undefined && { relation }),
    ...(phone !== undefined && { phone }),
    ...(email !== undefined && { email }),
  }
}

/**
 * The same contact, ranked so the screen can put the first call first.
 * @param answers The flattened answers.
 * @param prefix The question keys' shared prefix, such as `emergencyContact1`.
 * @param rank Which of the two to try first.
 * @returns The ranked contact, or undefined when no name was given.
 */
function toEmergencyContact(
  answers: Answers,
  prefix: string,
  rank: EmergencyContact["rank"],
): EmergencyContact | undefined {
  const person = toContactPerson(answers, prefix)
  return person === undefined ? undefined : { ...person, rank }
}

/**
 * The free-text messages, each addressed to whoever the form said would read it: the
 * participant form asks one question for the unit leader and one for the contingent
 * management, the leader form only the latter.
 * @param answers The flattened answers.
 * @returns The notes that were written, each with its audience.
 */
function toNotes(answers: Answers): readonly Note[] {
  const notes: Note[] = []
  const toLeader = answer(answers, "additionalInfoUnitLeader")
  if (toLeader !== undefined) {
    notes.push({ audience: "avdelningsledaren", text: toLeader })
  }
  const toCmt = answer(answers, "additionalInfo")
  if (toCmt !== undefined) {
    notes.push({ audience: "kontingentledningen", text: toCmt })
  }
  return notes
}
