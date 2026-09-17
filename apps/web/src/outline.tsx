import { PageOutline } from "@scouterna/wsj27-campfire-ui"
import { useRouterState } from "@tanstack/react-router"
import { useEffect, useRef, useState, type ReactElement } from "react"

import { scrollBehavior, scrollToTop } from "./navigation"

export interface OutlineProps {
  /**
   * The page's own title – the outline's single entry on a page with no headings.
   */
  readonly title: string
}

// What counts as a page section: the headings the page renders into the content column.
const sections = "main h2"

/**
 * What the desktop outline is about on this page, read from the page as rendered, so a
 * module never has to declare its own table of contents. A page without headings still
 * gets one entry, its own title, so the column never sits empty. The current entry
 * follows the column's scroll; a click selects immediately and holds the choice until
 * the smooth scroll has settled, so the spy cannot argue with it mid-flight. The
 * drawing is the ui library's `PageOutline`.
 *
 * @param props The page's own title.
 * @returns The outline column.
 */
export function Outline(props: OutlineProps): ReactElement | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [headings, setHeadings] = useState<readonly string[]>([])
  const [current, setCurrent] = useState(0)
  const holdUntil = useRef(0)

  useEffect(() => {
    // The outline can only be read from the DOM the page just rendered, so the scan
    // happens in an effect and lands in state. A page can change its sections without
    // a navigation, so the scan also follows the page's mutations.
    const scan = (): void => {
      setHeadings([...document.querySelectorAll(sections)].map((heading) => heading.textContent))
    }

    scan()

    const main = document.querySelector("main")
    if (!main) {
      return
    }
    const observer = new MutationObserver(scan)
    observer.observe(main, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
    }
  }, [pathname])

  // The spy: the current entry is the last heading that has passed the reading line
  // near the column's top – or the last entry once the column is scrolled out.
  useEffect(() => {
    const column = document.querySelector(".page")
    if (!(column instanceof HTMLElement)) {
      return
    }

    const onScroll = (): void => {
      if (performance.now() < holdUntil.current) {
        return
      }

      const found = document.querySelectorAll(sections)
      if (found.length === 0) {
        return
      }

      const line = column.getBoundingClientRect().top + 90
      let index = 0
      found.forEach((heading, at) => {
        if (heading.getBoundingClientRect().top <= line) {
          index = at
        }
      })
      if (column.scrollTop + column.clientHeight >= column.scrollHeight - 2) {
        index = found.length - 1
      }
      setCurrent(index)
    }

    onScroll()
    // eslint-disable-next-line unicorn/prefer-observer-apis -- "the last heading above the line" compares every heading at once; an observer answers it only with more bookkeeping than the read it saves
    column.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      column.removeEventListener("scroll", onScroll)
    }
  }, [pathname])

  const entries = headings.length > 0 ? headings : [props.title]
  // The heading the spy last chose can fall off when the page shortens the list.
  const chosen = Math.min(current, entries.length - 1)

  return (
    <PageOutline
      entries={entries}
      current={chosen}
      onSelect={(index) => {
        setCurrent(index)
        holdUntil.current = performance.now() + 800
        if (headings.length === 0 || index === 0) {
          scrollToTop()
          return
        }
        // `.at` rather than `.item`: the DOM can have shortened since the scan landed
        // in state, and `NodeListOf.item` is typed as though it never returns null.
        const heading = [...document.querySelectorAll(sections)].at(index)
        heading?.scrollIntoView({ behavior: scrollBehavior(), block: "start" })
      }}
    />
  )
}
