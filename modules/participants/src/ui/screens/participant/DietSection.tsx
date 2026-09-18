import { Card, Chip, DotMeter, type DotMeterTone } from "@scouterna/wsj27-campfire-ui"
import { Fragment, type ReactElement } from "react"

import {
  allergenName,
  dietName,
  severityName,
  type HealthProfile,
  type Severity,
} from "../../../model/HealthProfile"

export interface DietSectionProps {
  /**
   * The health profile whose diet and allergies to draw.
   */
  readonly health: HealthProfile
}

/**
 * The dot color family for a severity: danger for the life-threatening top of the scale,
 * caution just under it, info for the mild end.
 * @param severity The graded severity.
 * @returns The tone the meter and its reading wear.
 */
function severityTone(severity: Severity): DotMeterTone {
  if (severity >= 5) {
    return "danger"
  }
  return severity === 4 ? "caution" : "info"
}

interface FreeTextProps {
  /**
   * The line over the quote – the registration's question, shortened to a label.
   */
  readonly label: string
  /**
   * What they wrote.
   */
  readonly text: string
}

/**
 * One free-text answer: the question in quiet type, and the answer in the person's own
 * words under it.
 * @param props What was asked, and what they wrote.
 * @returns The block.
 */
function FreeText(props: FreeTextProps): ReactElement {
  return (
    <div className="person-free-text">
      <small>{props.label}</small>
      <strong>{props.text}</strong>
    </div>
  )
}

/**
 * Kost och allergier: the diet chip – or the all-clear chips where there is nothing to
 * flag – the graded allergens as dot meters, and the free texts around them.
 * @param props The health profile whose diet and allergies to draw.
 * @returns The card.
 */
export function DietSection(props: DietSectionProps): ReactElement {
  const health = props.health

  const severities = health.foodAllergy?.severities ?? []
  const freeTexts = [
    health.diet?.details === undefined
      ? undefined
      : { label: "Beskriv din specialkost i detalj", text: health.diet.details },
    health.foodAllergy?.details === undefined
      ? undefined
      : { label: "Beskriv din allergi(er)", text: health.foodAllergy.details },
    health.otherAllergy === undefined
      ? undefined
      : { label: "Allvarligare allergi (ej födoämne)", text: health.otherAllergy },
  ].filter((text) => text !== undefined)

  return (
    <Card title="Kost och allergier">
      <div className="person-diet">
        <div className="person-chips">
          {health.diet === undefined ? (
            <Chip>Ingen specialkost</Chip>
          ) : (
            <Chip tone="positive">{dietName(health.diet.sort)}</Chip>
          )}
          {health.foodAllergy === undefined && <Chip>Inga matallergier</Chip>}
          {/* Declared, but with nothing graded and nothing written: the fact itself
              still has to show, or a leader reads the silence as no allergy at all. */}
          {health.foodAllergy?.severities.length === 0 &&
            health.foodAllergy.details === undefined && (
              <Chip tone="warning">Matallergi angiven utan detaljer</Chip>
            )}
          {health.otherAllergy === undefined && <Chip>Inga övriga allergier</Chip>}
        </div>

        {severities.length > 0 && (
          <div className="person-severities">
            {severities.map(({ allergen, severity }) => (
              <Fragment key={allergen}>
                <strong>{allergenName(allergen)}</strong>
                <DotMeter filled={severity} total={5} tone={severityTone(severity)} />
                <span className={`person-severity-${severityTone(severity)}`}>
                  {severity} · {severityName(severity)}
                </span>
              </Fragment>
            ))}
          </div>
        )}

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
