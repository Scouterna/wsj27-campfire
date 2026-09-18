import type { MouseEventHandler, ReactElement, ReactNode } from "react"

import "./Chip.css"

/**
 * The tints a badge chip can wear: neutral for a plain fact in the unit's own color,
 * positive for an all-clear, warning for a fact someone has to act on.
 */
export type ChipTone = "neutral" | "positive" | "warning"

export interface ChipProps {
  /**
   * The chip's label.
   */
  readonly children: ReactNode
  /**
   * What choosing the chip does. Without it the chip is a static badge rather than a
   * filter.
   */
  readonly onClick?: MouseEventHandler<HTMLButtonElement>
  /**
   * Whether this filter is the one in force. Only meaningful with `onClick`, and it is
   * what the chip's pressed state reports.
   */
  readonly selected?: boolean
  /**
   * The chip's tint when it stands as a badge. Neutral by default, and ignored by a
   * filter chip, whose look the selection decides.
   */
  readonly tone?: ChipTone
}

/**
 * One chip. With `onClick` it is a filter in a `.chips` row – a toggle, so it reports
 * whether it is the filter in force rather than pretending to be a location; without
 * it, it is a static badge in its tone's tint.
 *
 * @param props The label, the tone, and – for a filter – what choosing it does and
 * whether it is in force.
 * @returns The chip.
 */
export function Chip(props: ChipProps): ReactElement {
  if (props.onClick === undefined) {
    const tone = props.tone ?? "neutral"

    return (
      <span className={tone === "neutral" ? "chip chip-badge" : `chip chip-badge chip-${tone}`}>
        {props.children}
      </span>
    )
  }

  return (
    <button
      aria-pressed={props.selected === true}
      className="chip"
      onClick={props.onClick}
      type="button"
    >
      {props.children}
    </button>
  )
}
