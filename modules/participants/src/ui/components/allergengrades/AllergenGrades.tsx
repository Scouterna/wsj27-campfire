import { DotMeter, type DotMeterTone } from "@scouterna/wsj27-campfire-ui"
import { Fragment, type ReactElement } from "react"

import { worstFirst } from "../../../model/Care"
import {
  allergenName,
  noDescription,
  type FoodAllergy,
  type Severity,
} from "../../../model/HealthProfile"

import "./AllergenGrades.css"

/**
 * The dot color family for a severity: danger for the top of the scale, caution just
 * under it, info for the milder grades.
 * @param severity The graded severity.
 * @returns The tone the meter and its reading wear.
 */
function severityTone(severity: Severity): DotMeterTone {
  if (severity >= 5) {
    return "danger"
  }
  return severity === 4 ? "caution" : "info"
}

/**
 * The allergy an `AllergenGrades` draws, and in what order.
 */
export interface AllergenGradesProps {
  /**
   * The allergy as declared, whose ticked "Övriga" gets a row of its own.
   */
  readonly allergy: FoodAllergy
  /**
   * Whether the graded allergens read the worst first rather than in the form's order.
   */
  readonly isWorstFirst?: boolean
}

/**
 * The graded allergens as dot meters, the ungraded "Övriga" under them, and the scale's
 * two ends keyed under the rows.
 * @param props The allergy, and the order its grades read in.
 * @returns The grid, or nothing where there is nothing graded or ticked.
 */
export function AllergenGrades(props: AllergenGradesProps): ReactElement | null {
  const { allergy } = props
  const severities =
    props.isWorstFirst === true ? worstFirst(allergy.severities) : allergy.severities
  const hasOther = allergy.hasOther === true
  if (severities.length === 0 && !hasOther) {
    return null
  }
  return (
    <div className="person-severities">
      {severities.map(({ allergen, severity }) => (
        <Fragment key={allergen}>
          <strong>{allergenName(allergen)}</strong>
          <DotMeter filled={severity} total={5} tone={severityTone(severity)} />
          <span className={`person-severity-${severityTone(severity)}`}>{severity} av 5</span>
        </Fragment>
      ))}
      {/* The participant form's Övriga is a yes with no grade, so it has no meter. */}
      {hasOther && (
        <>
          <strong>{allergenName("other")}</strong>
          <span className="person-severity-ungraded">
            {allergy.details === undefined ? noDescription : "Se beskrivning"}
          </span>
        </>
      )}
      {/* The form names only the ends of its scale, so a grade is read as a number and the
          two ends are keyed under the rows rather than named on them. */}
      {severities.length > 0 && (
        <dl>
          <dt>1 =</dt>
          <dd>Inte allergisk eller intolerant</dd>
          <dt>5 =</dt>
          <dd>Väldigt allergisk eller intolerant</dd>
        </dl>
      )}
    </div>
  )
}
