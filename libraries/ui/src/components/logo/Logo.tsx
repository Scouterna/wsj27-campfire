import type { ReactElement } from "react"

import "./Logo.css"

export type LogoProps = {
  /**
   * The word the mark spells out.
   */
  readonly name: string
  /**
   * Whether to draw the mark at the size a bar carries, rather than the size a page
   * opens with. Full size by default.
   */
  readonly compact?: boolean
}

/**
 * The wordmark: the product's name, in the unit color in force.
 *
 * @param props The name to draw, and how large.
 * @returns The mark.
 */
export function Logo(props: LogoProps): ReactElement {
  const classes = props.compact === true ? "logo logo-compact" : "logo"

  return <span className={classes}>{props.name}</span>
}
