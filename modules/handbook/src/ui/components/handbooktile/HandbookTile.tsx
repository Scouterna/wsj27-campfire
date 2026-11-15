import type { ReactElement, ReactNode } from "react"

import "./HandbookTile.css"

export type HandbookTileProps = {
  /**
   * What the tile shows – a chapter's number, or the FAQ's mark.
   */
  readonly children: ReactNode
}

/**
 * The round tile at the head of a handbook row, as a person's initials head theirs: a
 * chapter's number in the display face the page titles wear, or the FAQ's mark. Hidden
 * from assistive technology, because the row's text says where it leads.
 * @param props What the tile shows.
 * @returns The tile.
 */
export function HandbookTile(props: HandbookTileProps): ReactElement {
  return (
    <span aria-hidden="true" className="handbook-tile">
      {props.children}
    </span>
  )
}
