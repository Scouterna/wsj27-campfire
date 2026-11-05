import type { ReactElement } from "react"

import "./FreeText.css"

/**
 * What was asked, and what a `FreeText` quotes of the answer.
 */
export interface FreeTextProps {
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
export function FreeText(props: FreeTextProps): ReactElement {
  return (
    <div className="person-free-text">
      <small>{props.label}</small>
      <strong>{props.text}</strong>
    </div>
  )
}
