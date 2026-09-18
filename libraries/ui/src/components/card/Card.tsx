import type { ReactElement, ReactNode } from "react"

import "./Card.css"

export interface CardProps {
  /**
   * The quiet line at the heading row's trailing edge – a count, a date. Phrasing
   * content only: it is drawn inside a `span`, outside the heading, so the page outline
   * lists the title alone and assistive technology reads the aside after it. Drops
   * under the title where the row cannot hold both. Nothing without a `title`.
   */
  readonly aside?: ReactNode
  /**
   * What the card holds.
   */
  readonly children: ReactNode
  /**
   * The card's heading, over the sheet. A card heading is an `h2`, so the page
   * outline lists the card as a section.
   */
  readonly title?: string
}

/**
 * A white sheet raised off the paper: the surface a screen's block of content sits on,
 * with an optional heading above it.
 *
 * @param props The content to hold, and the heading over it.
 * @returns The card – wrapped as a section when it carries a heading.
 */
export function Card(props: CardProps): ReactElement {
  if (props.title === undefined) {
    return <div className="card">{props.children}</div>
  }

  return (
    <section className="card-section">
      <div className="card-heading">
        <h2 className="card-title">{props.title}</h2>
        {props.aside === undefined ? null : <span className="card-aside">{props.aside}</span>}
      </div>
      <div className="card">{props.children}</div>
    </section>
  )
}
