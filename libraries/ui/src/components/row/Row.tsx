import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import { BackIcon } from "../../foundations/icons/set/BackIcon"
import type { AppPath } from "../../routing/routes"

import "./Row.css"

export interface RowProps {
  /**
   * Where the row leads. A row without it does not react to a press.
   */
  readonly link?: {
    /**
     * The address the row opens.
     */
    readonly to: AppPath
  }
  /**
   * The tile at the head of the row – an avatar, a mark.
   */
  readonly leading: ReactNode
  /**
   * What sits at the end. Left out, a navigating row gets the chevron.
   */
  readonly trailing?: ReactNode
  /**
   * An extra class on the row, for a row of its own shape. The rule lives in the
   * caller's own stylesheet.
   */
  readonly className?: string
  /**
   * The text column – a strong line, then the quiet ones under it.
   */
  readonly children: ReactNode
}

/**
 * A list row: a leading tile, the text column, and an optional trailing slot, with the
 * chevron implied when the row navigates. Inside a `Card` the row bleeds to the card's
 * edges, so a press fills the full width and the dividers run edge to edge.
 *
 * @param props The tile, the text, the trailing slot, and where the row leads.
 * @returns The row.
 */
export function Row(props: RowProps): ReactElement {
  const content = (
    <>
      {props.leading}
      <span>{props.children}</span>
      {props.trailing ??
        (props.link ? (
          <span className="row-chevron" aria-hidden="true">
            <BackIcon size={16} strokeWidth={2.1} />
          </span>
        ) : (
          <span />
        ))}
    </>
  )

  const className = props.className === undefined ? "row" : `row ${props.className}`

  return props.link ? (
    <Link className={className} to={props.link.to}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
