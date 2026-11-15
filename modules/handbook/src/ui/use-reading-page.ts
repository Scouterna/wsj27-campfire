import { useEffect, useMemo, useState } from "react"

import type { ChapterEntry } from "../model/Handbook"

// How close to its end a scroll counts as at the end, for a rounded scroll position.
const endSlackPx = 2

/**
 * The page of the chapter on screen that is being read.
 * @param chapter The chapter on screen, or undefined on the contents.
 * @returns The page's slug, or undefined until a page has reached the band, or off a
 * chapter.
 */
export function useReadingPage(chapter: ChapterEntry | undefined): string | undefined {
  const anchors = useMemo(() => chapter?.pages.map((page) => page.slug) ?? [], [chapter])
  return useReadingAnchor(anchors)
}

/**
 * Which of a screen's parts is being read – the one that crosses the band just under the
 * bar, where the reader's eyes are, or the last one once the reader has scrolled to the
 * end, since a short last part never reaches the band.
 * @param anchors The ids of the parts, in the order they stand on the screen. Held still
 * between renders by the caller, because a new list starts the watching over.
 * @returns The id of the part being read, or undefined until one has reached the band.
 */
export function useReadingAnchor(anchors: readonly string[]): string | undefined {
  const [reading, setReading] = useState<string>()

  useEffect(() => {
    if (anchors.length === 0) {
      return
    }
    // At the end of the scroll the last page is the one being read, whatever crosses the
    // band, since a short last page never reaches it. The observer reports after the
    // scroll that got there, so it is told to leave the mark alone.
    const last = anchors.at(-1)
    let isAtEnd = false

    // The band is the top fifth of the screen. Of the parts crossing it the lowest is the
    // one being read, and past the last part the last one stays marked. Every part in
    // the band is remembered, because the observer reports only what changed – a part
    // leaving the band says nothing of the one above it that never left.
    const inBand = new Set<string>()
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          if (change.isIntersecting) {
            inBand.add(change.target.id)
          } else {
            inBand.delete(change.target.id)
          }
        }
        const lowest = anchors.findLast((anchor) => inBand.has(anchor))
        if (lowest !== undefined && !isAtEnd) {
          setReading(lowest)
        }
      },
      { rootMargin: "0px 0px -80% 0px" },
    )
    for (const anchor of anchors) {
      const section = document.querySelector(`#${CSS.escape(anchor)}`)
      if (section !== null) {
        observer.observe(section)
      }
    }
    // Captured at the document, because the column scrolls in a wide layout and the
    // window in a narrow one. Any other scroller – the outline's own – is not the reading.
    const first = document.querySelector(`#${CSS.escape(anchors[0] ?? "")}`)
    const onScroll = (event: Event): void => {
      const scroller = event.target instanceof Element ? event.target : document.scrollingElement
      if (scroller === null || first === null || !scroller.contains(first)) {
        return
      }
      const wasAtEnd = isAtEnd
      isAtEnd =
        scroller.scrollTop > 0 &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - endSlackPx
      if (isAtEnd && last !== undefined) {
        setReading(last)
      } else if (wasAtEnd) {
        // Back from the end, the mark returns to what is in the band, which the observer
        // has no reason to report again.
        const lowest = anchors.findLast((anchor) => inBand.has(anchor))
        if (lowest !== undefined) {
          setReading(lowest)
        }
      }
    }
    // eslint-disable-next-line unicorn/prefer-observer-apis -- the end of a scroll is no element's intersection, since a short last page never reaches any band
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => {
      observer.disconnect()
      document.removeEventListener("scroll", onScroll, { capture: true })
    }
  }, [anchors])

  // A part of the screen that was on show before is not being read on this one.
  return reading !== undefined && anchors.includes(reading) ? reading : undefined
}
