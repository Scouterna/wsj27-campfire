import type { ReactElement, ReactNode } from "react"

import "./EmptyState.css"

export interface EmptyStateProps {
  /**
   * A quiet line under the title saying what to do about it. Left out when there is
   * nothing to be done.
   */
  readonly hint?: string
  /**
   * The mark in the circle over the words – the search glyph for an empty search,
   * the section's own for an empty list.
   */
  readonly icon: ReactNode
  /**
   * What the emptiness is, in two or three words.
   */
  readonly title: string
}

/**
 * A friendly empty state: an icon on the theme's wash, the short answer, and a hint.
 * Presentation only – the words are the screen's, and the screen keeps announcing them
 * through its own status element, so this block can stay out of the live region.
 *
 * @param props The mark, the title, and the hint under it.
 * @returns The block, centered where the rows would have been.
 */
export function EmptyState(props: EmptyStateProps): ReactElement {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">
        {props.icon}
      </span>
      <p className="empty-state-title">{props.title}</p>
      {props.hint === undefined ? null : <p className="empty-state-hint">{props.hint}</p>}
    </div>
  )
}
