import {
  Callout,
  Card,
  IdCardIcon,
  UnitAvatar,
  useUnitIdentities,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement, ReactNode } from "react"

import { avatarNumberFor, belonging } from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { roleName } from "../../../model/ParticipantRole"
import { funktionName, travelName } from "../../../model/Participation"
import { PersonBadge } from "../../badge/PersonBadge"

export interface ProfileSectionProps {
  /**
   * Whose profile to draw.
   */
  readonly participant: ParticipantDetail
}

// Constructed once, and read in UTC: the service sends a plain date, which parses as UTC
// midnight, and formatting that in a timezone behind it would report the day before.
const swedishDate = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeZone: "UTC" })

/**
 * The birth date in Swedish. The service sends a plain `YYYY-MM-DD`, and anything else it
 * ever sends is shown exactly as it arrived rather than guessed at.
 * @param birthDate The date as the participants service spells it.
 * @returns The date to draw.
 */
function birthDateText(birthDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(birthDate)) {
    return birthDate
  }
  const date = new Date(birthDate)
  return Number.isNaN(date.getTime()) ? birthDate : swedishDate.format(date)
}

interface FactProps {
  /**
   * What was asked.
   */
  readonly label: string
  /**
   * What was answered, where anything was.
   */
  readonly value?: string
}

/**
 * One fact in the row under the identity: the question in quiet type, and the answer –
 * or the designed absent state where the record holds none.
 * @param props What was asked, and what it was answered with.
 * @returns The fact.
 */
function Fact(props: FactProps): ReactElement {
  return (
    <div>
      <small>{props.label}</small>
      {props.value === undefined ? <em>Ej angiven</em> : <strong>{props.value}</strong>}
    </div>
  )
}

/**
 * The line placing the person: the function a management member serves in where the
 * record carries one, and where they belong otherwise – a unit with its name joined
 * on when the identities know one.
 * @param participant Whose profile is being drawn.
 * @param unitName What the unit is called, where the identities know it.
 * @returns The label and the value of the placing line.
 */
function placing(
  participant: ParticipantDetail,
  unitName: string | undefined,
): { label: string; value: string } {
  if (participant.funktion !== undefined) {
    const fa = participant.isFunktionsansvarig === true ? " · FA" : ""
    return { label: "Funktion", value: `${funktionName(participant.funktion)}${fa}` }
  }
  // The IST's patrols are not placed yet, and the line above already says IST – so the
  // belonging is honestly an open question rather than the role repeated.
  if (participant.role === "ist") {
    return { label: "Tillhörighet", value: "?" }
  }
  const value =
    unitName === undefined ? belonging(participant) : `${belonging(participant)} · ${unitName}`
  return { label: "Tillhörighet", value }
}

/**
 * Profil: the badge, what kind of registration this is and where it places the person,
 * the registration facts, and the ID-card name lifted out when one was given.
 * @param props Whose profile to draw.
 * @returns The card.
 */
export function ProfileSection(props: ProfileSectionProps): ReactElement {
  const participant = props.participant

  const identities = useUnitIdentities()
  const unitName =
    participant.unitNumber === undefined ? undefined : identities.name(participant.unitNumber)
  const where = placing(participant, unitName)
  const avatarNumber = avatarNumberFor(participant)

  return (
    <Card title="Profil">
      <div className="person-profile">
        <div className="person-profile-identity">
          {avatarNumber === undefined ? (
            <PersonBadge
              firstName={participant.firstName}
              lastName={participant.lastName}
              size="profile"
            />
          ) : (
            <UnitAvatar
              isLeader={participant.role === "ledare"}
              size="profile"
              unitNumber={avatarNumber}
            />
          )}
          <div className="person-profile-lines">
            <p>
              <span>Typ av anmälan:</span> <strong>{roleName(participant.role)}</strong>
            </p>
            <p>
              <span>{where.label}:</span> <strong>{where.value}</strong>
            </p>
          </div>
        </div>

        <div className="person-profile-grid">
          <Fact
            label="Scoutkår"
            {...(participant.memberGroup !== undefined && { value: participant.memberGroup })}
          />
          <Fact label="Medlemsnummer" value={participant.memberNo} />
          <Fact
            label="Födelsedatum"
            {...(participant.birthDate !== undefined && {
              value: birthDateText(participant.birthDate),
            })}
          />
          <Fact
            label="Typ av resa"
            {...(participant.travel !== undefined && { value: travelName(participant.travel) })}
          />
        </div>

        {idCardCallout(participant.idCardName)}
      </div>
    </Card>
  )
}

/**
 * The name on the ID card, lifted onto its own plate – the one registration answer the
 * contingent has to read off a document rather than off a screen. Nothing at all when no
 * name was given, which is the overwhelmingly common case.
 * @param idCardName The name on the card, where one was given.
 * @returns The plate, or nothing.
 */
function idCardCallout(idCardName: string | undefined): ReactNode {
  if (idCardName === undefined) {
    return null
  }
  return (
    <Callout icon={<IdCardIcon />} title="Namn på ID-kortet">
      {idCardName}
    </Callout>
  )
}
