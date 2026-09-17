import { useLayoutEffect, useRef, type ReactElement } from "react"

import "./PageOutline.css"

export interface PageOutlineProps {
  /**
   * What the column is called, above the entries. "På denna sida" without one.
   */
  readonly label?: string
  /**
   * The page's sections, in the order they appear.
   */
  readonly entries: readonly string[]
  /**
   * Which entry the reader is at, by index.
   */
  readonly current: number
  /**
   * What choosing an entry does. Scrolling the page there is the caller's to do – the
   * outline knows the names, not the document.
   */
  readonly onSelect: (index: number) => void
}

/**
 * The desktop outline: the page's sections listed beside it, the one being read marked
 * by a line that slides along the rail as the mark moves. Which sections a page has,
 * and what choosing one scrolls to, are the caller's – this draws the list and says
 * which entry was picked.
 *
 * @param props The entries, the current one, and what choosing one does.
 * @returns The column.
 */
export function PageOutline(props: PageOutlineProps): ReactElement {
  const items = useRef<HTMLDivElement>(null)
  const { current, entries } = props

  // The marker's geometry, written as custom properties before paint: on the first
  // render the line appears in place, and on every later change the stylesheet's
  // transition slides it there.
  useLayoutEffect(() => {
    const list = items.current
    const target = list?.querySelectorAll("button").item(current)
    if (!list || !(target instanceof HTMLElement)) {
      return
    }
    list.style.setProperty("--outline-marker-top", `${String(target.offsetTop)}px`)
    list.style.setProperty("--outline-marker-height", `${String(target.offsetHeight)}px`)
  }, [current, entries])

  return (
    <aside className="outline">
      <div className="outline-label">{props.label ?? "På denna sida"}</div>
      <div className="outline-items" ref={items}>
        <span className="outline-marker" />
        {props.entries.map((entry, index) => (
          <button
            // The position, not the text: two sections may share a heading, and the
            // list is positional – the caller selects by index.
            key={index}
            type="button"
            aria-current={index === props.current ? "true" : undefined}
            onClick={() => {
              props.onSelect(index)
            }}
          >
            {entry}
          </button>
        ))}
      </div>
    </aside>
  )
}
