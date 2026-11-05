import { Card, Chip } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { dietName, isBlankAllergy, type HealthProfile } from "../../../model/HealthProfile"
import { AllergenGrades } from "../../components/allergengrades/AllergenGrades"
import { FreeText } from "../../components/freetext/FreeText"
import { blankAllergyLabel, foodTexts } from "../../health-rows"

import "./DietSection.css"

/**
 * The answers a `DietSection` draws.
 */
export interface DietSectionProps {
  /**
   * The health profile whose diet and allergies to draw.
   */
  readonly health: HealthProfile
}

/**
 * The chips over the card: the diet, a food allergy declared with nothing to show, and
 * each question answered no or left unanswered.
 *
 * An all-clear is drawn only on a card that declares nothing, because beside an allergy or
 * a diet it reads as a contradiction of what is drawn under it.
 * @param health The health profile whose answers the chips sum up.
 * @returns The chips, in reading order.
 */
function chipsOf(health: HealthProfile): readonly ReactElement[] {
  const isDeclared =
    health.diet !== undefined ||
    health.foodAllergy !== undefined ||
    health.otherAllergy !== undefined
  const chips: ReactElement[] = []
  if (health.diet !== undefined) {
    chips.push(
      <Chip key="diet" tone="positive">
        {dietName(health.diet.sort)}
      </Chip>,
    )
  } else if (health.deniesDiet !== true) {
    chips.push(<Chip key="diet">Specialkost ej besvarad</Chip>)
  } else if (!isDeclared) {
    chips.push(<Chip key="diet">Ingen specialkost</Chip>)
  }
  if (health.foodAllergy !== undefined && isBlankAllergy(health.foodAllergy)) {
    chips.push(
      <Chip key="food" tone="warning">
        {blankAllergyLabel}
      </Chip>,
    )
  } else if (health.foodAllergy === undefined && health.deniesFoodAllergy !== true) {
    chips.push(<Chip key="food">Matallergi ej besvarad</Chip>)
  } else if (health.foodAllergy === undefined && !isDeclared) {
    chips.push(<Chip key="food">Inga matallergier</Chip>)
  }
  // The form's question on allergies that are not food, worded so it never reads as an
  // all-clear on food.
  if (health.otherAllergy === undefined && health.deniesOtherAllergy !== true) {
    chips.push(<Chip key="other">Allergier utöver mat ej besvarade</Chip>)
  } else if (health.otherAllergy === undefined && !isDeclared) {
    chips.push(<Chip key="other">Inga allergier utöver mat</Chip>)
  }

  return chips
}

/**
 * Kost och allergier: the diet chip, the graded allergens as dot meters, and the free texts
 * around them. A question with nothing declared reads as a no only where it was answered no
 * and nothing else on the card is declared, and says it went unanswered otherwise.
 * @param props The health profile whose diet and allergies to draw.
 * @returns The card.
 */
export function DietSection(props: DietSectionProps): ReactElement {
  const health = props.health

  const texts = foodTexts(health)
  const freeTexts = [texts.diet, texts.allergy, texts.otherAllergy].filter(
    (text) => text !== undefined,
  )

  const chips = chipsOf(health)

  return (
    <Card title="Kost och allergier">
      <div className="person-diet">
        {chips.length > 0 && <div className="person-chips">{chips}</div>}

        {health.foodAllergy !== undefined && <AllergenGrades allergy={health.foodAllergy} />}

        {freeTexts.length > 0 && (
          <div className="person-diet-notes">
            {freeTexts.map((text) => (
              <FreeText key={text.label} label={text.label} text={text.text} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
