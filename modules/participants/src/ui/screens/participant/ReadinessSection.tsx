import { Card, CheckIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Readiness } from "../../../model/Readiness"

export interface ReadinessSectionProps {
  /**
   * The readiness factors the service exports, and the clarification behind them.
   */
  readonly readiness: Readiness
}

interface FactorTileProps {
  /**
   * What was asked.
   */
  readonly label: string
  /**
   * Whether the answer was a yes.
   */
  readonly ok: boolean
}

/**
 * One factor as a tile: the positive tone with a check where the answer was yes, the
 * danger tone with a mark where it was no.
 * @param props What was asked, and whether the answer was a yes.
 * @returns The tile.
 */
function FactorTile(props: FactorTileProps): ReactElement {
  return (
    <div
      className={
        props.ok ? "person-readiness-tile" : "person-readiness-tile person-readiness-warning"
      }
    >
      <span className="person-readiness-mark" aria-hidden="true">
        {props.ok ? <CheckIcon strokeWidth={3} /> : "!"}
      </span>
      <span>{props.label}</span>
    </div>
  )
}

/**
 * Aktivitetsberedskap: the swim and crowd answers as tiles, and the person's own
 * clarification quoted under them.
 * @param props The readiness factors and the clarification.
 * @returns The card.
 */
export function ReadinessSection(props: ReadinessSectionProps): ReactElement {
  const readiness = props.readiness

  return (
    <Card title="Aktivitetsberedskap">
      <div className="person-readiness">
        {readiness.swims200m !== undefined && (
          <FactorTile label="Simmar 200 m" ok={readiness.swims200m} />
        )}
        {readiness.comfortableInCrowds !== undefined && (
          <FactorTile label="Stora folksamlingar" ok={readiness.comfortableInCrowds} />
        )}
        {readiness.clarification !== undefined && (
          <p className="person-clarification">
            <q>{readiness.clarification}</q> – förtydligande
          </p>
        )}
      </div>
    </Card>
  )
}
