import { useLayoutEffect, useRef, type ReactElement } from "react"

import "./PageOutline.css"

/**
 * One entry in the outline: its label alone for a section of the page, or the label with
 * how deep it sits, for an outline that nests – a chapter's pages under the chapter.
 */
export type OutlineEntry =
  | string
  | {
      /**
       * Whether the entry sits under the one before it, drawn indented and smaller.
       */
      readonly isNested: boolean
      /**
       * What the entry says.
       */
      readonly label: string
    }

export interface PageOutlineProps {
  /**
   * What the column is called, above the entries. "På denna sida" without one.
   */
  readonly label?: string
  /**
   * The page's sections, in the order they appear.
   */
  readonly entries: readonly OutlineEntry[]
  /**
   * Which entry the reader is at, by index – or -1 for none, where the page is not one
   * of the entries.
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
 * by a line that slides along the rail. Which sections a page has, and what choosing
 * one scrolls to, are the caller's.
 *
 * @param props The entries, the current one, and what choosing one does.
 * @returns The column.
 */
export function PageOutline(props: PageOutlineProps): ReactElement {
  const items = useRef<HTMLDivElement>(null)
  const { current, entries } = props

  // The marker's geometry, written as custom properties before paint, so the line
  // appears in place on the first render and the stylesheet's transition slides it on
  // every later change.
  useLayoutEffect(() => {
    const list = items.current
    const target = list?.querySelectorAll("button").item(current)
    if (!list) {
      return
    }
    if (!(target instanceof HTMLElement)) {
      list.style.setProperty("--outline-marker-height", "0px")
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
        {props.entries.map((entry, index) => {
          const isNested = typeof entry !== "string" && entry.isNested
          return (
            <button
              // Keyed by position, because two sections may share a heading and the
              // caller selects by index.
              key={index}
              className={isNested ? "outline-nested" : undefined}
              type="button"
              aria-current={index === props.current ? "true" : undefined}
              onClick={() => {
                props.onSelect(index)
              }}
            >
              {typeof entry === "string" ? entry : entry.label}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
