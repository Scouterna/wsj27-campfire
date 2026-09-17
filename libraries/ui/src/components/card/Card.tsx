import type { ReactElement, ReactNode } from "react"

import "./Card.css"

export interface CardProps {
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
      <h2 className="card-title">{props.title}</h2>
      <div className="card">{props.children}</div>
    </section>
  )
}
