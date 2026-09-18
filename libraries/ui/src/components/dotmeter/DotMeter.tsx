import type { ReactElement } from "react"

import "./DotMeter.css"

/**
 * The color families a meter's filled dots wear: danger for the top of a severity
 * scale, caution just under it, info for the mild end and for a plain reading.
 */
export type DotMeterTone = "caution" | "danger" | "info"

export interface DotMeterProps {
  /**
   * How many dots are filled.
   */
  readonly filled: number
  /**
   * The dots' size: regular for a row of its own, small for the dots inside a pill.
   * Regular by default.
   */
  readonly size?: "regular" | "small"
  /**
   * The filled dots' color family.
   */
  readonly tone: DotMeterTone
  /**
   * How many dots the scale holds.
   */
  readonly total: number
}

/**
 * N of M filled dots – a severity, a proficiency – reported as a meter, so the reading
 * is heard as a number rather than counted by eye.
 *
 * @param props The reading, the scale it is on, and how the dots are drawn.
 * @returns The meter.
 */
export function DotMeter(props: DotMeterProps): ReactElement {
  const classes = ["meter", `meter-${props.tone}`]
  if (props.size === "small") {
    classes.push("meter-small")
  }

  return (
    <span
      aria-label={`${String(props.filled)} av ${String(props.total)}`}
      aria-valuemax={props.total}
      aria-valuemin={0}
      aria-valuenow={props.filled}
      className={classes.join(" ")}
      role="meter"
    >
      {Array.from({ length: props.total }, (_, dot) => (
        <span key={dot} className={dot < props.filled ? "meter-filled" : undefined} />
      ))}
    </span>
  )
}
