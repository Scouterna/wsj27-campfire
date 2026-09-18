import type { ReactElement, ReactNode } from "react"

import "./Callout.css"

export interface CalloutProps {
  /**
   * The value the plate exists for.
   */
  readonly children: ReactNode
  /**
   * The glyph in the white tile – one of the design system's stroke icons, left
   * unsized so the tile decides how big it is drawn.
   */
  readonly icon: ReactElement
  /**
   * The small title over the value – what the value answers.
   */
  readonly title: string
}

/**
 * A tinted plate lifting one fact out of a card: the icon in its tile, a small title,
 * and the value under it in a prominent size.
 *
 * @param props The icon, the title over the value, and the value.
 * @returns The plate.
 */
export function Callout(props: CalloutProps): ReactElement {
  return (
    <div className="callout">
      <span className="callout-tile" aria-hidden="true">
        {props.icon}
      </span>
      <span className="callout-text">
        <small>{props.title}</small>
        <strong>{props.children}</strong>
      </span>
    </div>
  )
}
