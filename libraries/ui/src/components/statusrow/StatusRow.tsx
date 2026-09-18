import type { ReactElement, ReactNode } from "react"

import { CheckIcon } from "../../foundations/icons/set/CheckIcon"

import "./StatusRow.css"

/**
 * What a row reports: an answered yes, an answered no, or a question nobody answered –
 * which is a third state rather than a no, and reads as one.
 */
export type StatusRowState = "no" | "unanswered" | "yes"

export interface StatusRowProps {
  /**
   * What was asked.
   */
  readonly label: string
  /**
   * The answer the row reports.
   */
  readonly state: StatusRowState
  /**
   * The trailing pill – a year, a count. An unanswered row says so instead, so it
   * never shows this.
   */
  readonly trailing?: string
}

/**
 * One yes, no, or unanswered fact: a mark in its tone, the question, and an optional
 * trailing pill.
 *
 * @param props The answer, what was asked, and the pill at the end.
 * @returns The row.
 */
export function StatusRow(props: StatusRowProps): ReactElement {
  return (
    <div className={`status-row status-row-${props.state}`}>
      <span className="status-row-mark" aria-hidden="true">
        {mark(props.state)}
      </span>
      {/* The glyph is decorative, so the answer itself is spoken here – otherwise a
          yes row and a no row read identically to assistive technology. */}
      {props.state === "unanswered" ? null : (
        <span className="status-row-spoken">{props.state === "yes" ? "Ja: " : "Nej: "}</span>
      )}
      <span className="status-row-label">{props.label}</span>
      {trailer(props)}
    </div>
  )
}

/**
 * The glyph in the state circle. Drawn rather than spelled out, because the label
 * beside it already says what was asked and the circle only has to say the answer.
 * @param state The answer the row reports.
 * @returns The mark to draw.
 */
function mark(state: StatusRowState): ReactNode {
  if (state === "yes") {
    return <CheckIcon strokeWidth={3} />
  }

  return state === "no" ? "✕" : "?"
}

/**
 * What ends the row: an unanswered question says so in the row's own words, and any
 * other row shows the pill it was given, if it was given one.
 * @param props The answer and the pill at the end.
 * @returns The trailing element, or nothing.
 */
function trailer(props: StatusRowProps): ReactNode {
  if (props.state === "unanswered") {
    return <em>Ej besvarad</em>
  }

  if (props.trailing === undefined) {
    return null
  }

  return <span className="status-row-trailing">{props.trailing}</span>
}
