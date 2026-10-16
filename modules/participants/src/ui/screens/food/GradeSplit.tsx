import type { ReactElement } from "react"

import type { GradeCount } from "../../../model/food-overview"
import { severityTone } from "../../severity-tone"

export interface GradeSplitProps {
  /**
   * Each grade present and how many people have it, the highest first.
   */
  readonly split: readonly GradeCount[]
}

/**
 * How an allergen's people split across the grades: a bar of one segment per grade, sized
 * by its people and worn in its tone, and the same split in words under it, so it reads
 * without color and to a screen reader.
 * @param props The split to draw.
 * @returns The bar and its caption.
 */
export function GradeSplit(props: GradeSplitProps): ReactElement {
  return (
    <div className="food-split">
      <div aria-hidden="true" className="food-split-bar">
        {props.split.map(({ count, severity }) => (
          <span
            className={`food-split-segment food-tone-${severityTone(severity)}`}
            key={severity}
            // The share is the one value no rule can know.
            style={{ flexGrow: count }}
          />
        ))}
      </div>
      <p className="food-split-caption">
        {props.split
          .map(({ count, severity }) => `${String(count)} med ${String(severity)} av 5`)
          .join(", ")}
      </p>
    </div>
  )
}
