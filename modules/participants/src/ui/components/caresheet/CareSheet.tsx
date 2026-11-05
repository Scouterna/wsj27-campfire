import {
  Button,
  Card,
  Chip,
  FieldList,
  Sheet,
  UnitAvatar,
  useSectionLookup,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement, ReactNode } from "react"

import { dietName, isBlankAllergy, type HealthProfile } from "../../../model/HealthProfile"
import {
  ageOf,
  avatarNumberFor,
  fullName,
  unitOrPatrolLine,
  type Participant,
} from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { roleName } from "../../../model/ParticipantRole"
import { isPatrolMember } from "../../../model/Patrol"
import { blankAllergyLabel, foodTexts, urgentHealthRows } from "../../health-rows"
import { AllergenGrades } from "../allergengrades/AllergenGrades"
import { PersonBadge } from "../badge/PersonBadge"
import { FreeText } from "../freetext/FreeText"
import { NoteCallouts } from "../notecallouts/NoteCallouts"

import "./CareSheet.css"

/**
 * What tells a reader who they are looking at: their role, a deltagare's age, and where
 * they belong.
 * @param person The sheet's person.
 * @returns The line under their name.
 */
function placingOf(person: Participant): string {
  const age = person.role === "deltagare" ? ageOf(person, new Date()) : undefined
  return [
    roleName(person.role),
    age === undefined ? undefined : `${String(age)} år`,
    unitOrPatrolLine(person),
    isPatrolMember(person) ? person.patrol : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(" · ")
}

/**
 * The person's mark, as their row draws it.
 * @param person The sheet's person.
 * @returns Their unit's badge, or their initials.
 */
function markOf(person: Participant): ReactElement {
  const avatarNumber = avatarNumberFor(person)
  return avatarNumber === undefined ? (
    <PersonBadge firstName={person.firstName} lastName={person.lastName} size="row" />
  ) : (
    <UnitAvatar isLeader={person.role === "ledare"} unitNumber={avatarNumber} />
  )
}

/**
 * One titled block of the sheet.
 */
interface BlockProps {
  /**
   * What the block holds.
   */
  readonly children: ReactNode
  /**
   * The block's heading, under the sheet's own.
   */
  readonly title: string
}

/**
 * A heading over a white sheet, as a card reads on the person's page – one level down,
 * because here the person's name is the heading above it.
 * @param props The heading, and what it holds.
 * @returns The block.
 */
function Block(props: BlockProps): ReactElement {
  return (
    <section className="care-block">
      <h3>{props.title}</h3>
      <Card>{props.children}</Card>
    </section>
  )
}

/**
 * Whether the profile says anything about food – what was declared, never the all-clears
 * the person's page answers with, because a leader in a hurry reads what is there.
 * @param health The profile to weigh.
 * @returns True where an allergy or a diet was declared.
 */
function hasFoodAnswers(health: HealthProfile): boolean {
  return (
    health.foodAllergy !== undefined ||
    health.otherAllergy !== undefined ||
    health.diet !== undefined
  )
}

/**
 * What a `FoodFacts` draws from.
 */
interface FoodFactsProps {
  /**
   * The profile whose allergies and diet to draw.
   */
  readonly health: HealthProfile
}

/**
 * What the person cannot and has to eat: the allergies the worst first, each with what
 * was written about it, and then the diet.
 * @param props The profile.
 * @returns The facts.
 */
function FoodFacts(props: FoodFactsProps): ReactElement {
  const { diet, foodAllergy } = props.health
  const texts = foodTexts(props.health)
  return (
    <div className="care-food">
      {foodAllergy !== undefined && isBlankAllergy(foodAllergy) && (
        <div>
          <Chip tone="warning">{blankAllergyLabel}</Chip>
        </div>
      )}
      {foodAllergy !== undefined && <AllergenGrades allergy={foodAllergy} isWorstFirst />}
      {texts.allergy !== undefined && <FreeText {...texts.allergy} />}
      {texts.otherAllergy !== undefined && <FreeText {...texts.otherAllergy} />}
      {diet !== undefined && (
        <div>
          <Chip tone="positive">{dietName(diet.sort)}</Chip>
        </div>
      )}
      {texts.diet !== undefined && <FreeText {...texts.diet} />}
    </div>
  )
}

/**
 * Whose care a `CareSheet` shows, and how it is left.
 */
export interface CareSheetProps {
  /**
   * Closes the sheet.
   */
  readonly onClose: () => void
  /**
   * Their record in full.
   */
  readonly person: ParticipantDetail
}

/**
 * What a leader or a health reader needs to know about one person, to be read on a phone
 * in a tent: who they are, then what they cannot eat, with each allergy's grade as the
 * person's page draws it, what they take, what they carry, and how they feel, and what they
 * asked to be told – each block only where it has something to say, and every all-clear of
 * the person's page left out. The way to everything else about them shows only for a reader
 * whose menus lead to the person.
 * @param props The person, and how the sheet is left.
 * @returns The sheet.
 */
export function CareSheet(props: CareSheetProps): ReactElement {
  const { onClose, person } = props
  const { health, notes } = person
  const isGranted = useSectionLookup()("participants")
  const rows = health === undefined ? [] : urgentHealthRows(health)
  const hasFood = health !== undefined && hasFoodAnswers(health)

  return (
    <Sheet
      description={placingOf(person)}
      footer={
        isGranted ? (
          <Button
            isOnward
            label={`Visa allt om ${person.firstName}`}
            link={{ params: { memberNo: person.memberNo }, to: "/participants/$memberNo" }}
          />
        ) : undefined
      }
      isOpen
      leading={markOf(person)}
      onClose={onClose}
      title={fullName(person)}
    >
      <div className="care-sheet">
        {hasFood && (
          <Block title="Kost och allergier">
            <FoodFacts health={health} />
          </Block>
        )}
        {/* The notes sit with the health answers, as on the person's page, on the same
            white card as every other block. */}
        {(rows.length > 0 || notes.length > 0) && (
          <Block title="Hälsa">
            <div className="care-health">
              {rows.length > 0 && <FieldList fields={rows} />}
              <NoteCallouts notes={notes} />
            </div>
          </Block>
        )}
        {/* Something to hold on to, not a verdict, because a blank here is what was
            answered and never that the person needs nothing. */}
        {!hasFood && rows.length === 0 && notes.length === 0 && (
          <p className="care-nothing">Inga uppgifter om hälsa eller kost att visa.</p>
        )}
      </div>
    </Sheet>
  )
}
