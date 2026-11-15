import type { ReactElement, ReactNode } from "react"

import "./Card.css"

export interface CardProps {
  /**
   * The quiet line at the heading row's trailing edge – a count, a date. Phrasing
   * content only, because it is drawn inside a `span`. The span sits outside the
   * heading, so the page outline lists the title alone and assistive technology reads
   * the aside after it. Drops under the title where the row cannot hold both. Nothing
   * without a `title`.
   */
  readonly aside?: ReactNode
  /**
   * What the card holds.
   */
  readonly children: ReactNode
  /**
   * The level of the card's heading, for a card under a heading of the screen's own
   * rather than straight under its title. An `h2` without one.
   */
  readonly level?: 2 | 3 | undefined
  /**
   * The card's heading, over the sheet. A card heading is an `h2` unless `level` says
   * otherwise, so the page outline lists the card as a section.
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

  const Heading = props.level === 3 ? "h3" : "h2"
  return (
    <section className="card-section">
      <div className="card-heading">
        <Heading className="card-title">{props.title}</Heading>
        {props.aside === undefined ? null : <span className="card-aside">{props.aside}</span>}
      </div>
      <div className="card">{props.children}</div>
    </section>
  )
}
