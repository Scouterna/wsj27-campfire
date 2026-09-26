import { Card, StatusRow } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Booster, Vaccinations } from "../../../model/HealthProfile"

export interface VaccinationsSectionProps {
  /**
   * The vaccination answers everybody gives.
   */
  readonly vaccinations: Vaccinations
}

interface BoosterRowProps {
  /**
   * What was answered about the booster.
   */
  readonly booster: Booster
  /**
   * What the booster is called.
   */
  readonly name: string
}

/**
 * One booster as a status row: the year where it was given, the explicit no in adult age,
 * or the unanswered state – which is a third answer rather than a no.
 * @param props Which booster, and what was answered about it.
 * @returns The row.
 */
function BoosterRow(props: BoosterRowProps): ReactElement {
  switch (props.booster.kind) {
    case "given": {
      return (
        <StatusRow
          label={`${props.name} påfylld`}
          state="yes"
          trailing={String(props.booster.year)}
        />
      )
    }
    case "notGiven": {
      return <StatusRow label={`${props.name} ej påfylld i vuxen ålder`} state="no" />
    }
    case "unanswered": {
      return <StatusRow label={`${props.name} påfylld`} state="unanswered" />
    }
  }
}

/**
 * Vaccinationer: the childhood program and the boosters as status rows.
 * @param props The vaccination answers.
 * @returns The card.
 */
export function VaccinationsSection(props: VaccinationsSectionProps): ReactElement {
  const vaccinations = props.vaccinations

  return (
    <Card title="Vaccinationer">
      <div className="person-vaccinations">
        <StatusRow
          label="Barnvaccinationsprogrammet"
          state={vaccinations.childhoodProgram ? "yes" : "no"}
        />
        <BoosterRow booster={vaccinations.diphtheria} name="Difteri" />
        <BoosterRow booster={vaccinations.tetanus} name="Stelkramp" />
      </div>
    </Card>
  )
}
