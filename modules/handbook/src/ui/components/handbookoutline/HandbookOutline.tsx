import { PageJumps, type OutlineEntry } from "@scouterna/wsj27-campfire-ui"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react"

import { isIntroduction, type ChapterEntry, type HandbookPage } from "../../../model/Handbook"

export type HandbookOutlineProps = {
  /**
   * Every chapter, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * The chapter on screen, or undefined on the contents.
   */
  readonly current?: ChapterEntry
}

/**
 * One stop in the outline, and where it leads.
 */
type Stop = {
  readonly entry: ChapterEntry
  readonly page?: HandbookPage
}

/**
 * The whole handbook as the desktop outline: every chapter, its pages nested under it,
 * so the reader always sees where they are in all of it. On a chapter, the page being
 * read is marked as the reader scrolls; a stop in the chapter on screen scrolls there,
 * and any other opens its chapter at it.
 * @param props The chapters, and the one on screen.
 * @returns Nothing – the chrome's outline column draws the stops.
 */
export function HandbookOutline(props: HandbookOutlineProps): ReactElement {
  const navigate = useNavigate()
  const stops = useMemo(() => stopsOf(props.chapters), [props.chapters])
  const entries = useMemo(
    (): readonly OutlineEntry[] =>
      stops.map((stop) =>
        stop.page === undefined
          ? stop.entry.chapter.name
          : { isNested: true, label: stop.page.title },
      ),
    [stops],
  )
  const reading = useReadingPage(props.current)
  const hereId = props.current?.chapter.id

  // The page being read, or – above the first page, or on an introduction – the
  // chapter itself.
  const current = stops.findIndex((stop) =>
    reading === undefined
      ? stop.page === undefined && stop.entry.chapter.id === hereId
      : stop.page?.slug === reading,
  )
  const marked =
    current === -1
      ? stops.findIndex((stop) => stop.page === undefined && stop.entry.chapter.id === hereId)
      : current

  const onJump = useCallback(
    (index: number): void => {
      const stop = stops.at(index)
      if (stop === undefined) {
        return
      }
      const isHere = stop.entry.chapter.id === hereId
      void navigate({
        ...(stop.page !== undefined && { hash: stop.page.slug }),
        params: { chapter: stop.entry.chapter.slug },
        replace: isHere,
        to: "/handbook/$chapter",
      })
      if (isHere && stop.page === undefined) {
        document.querySelector(".handbook-section")?.scrollIntoView({ block: "start" })
      }
    },
    [hereId, navigate, stops],
  )

  return <PageJumps current={marked} entries={entries} onJump={onJump} />
}

/**
 * The outline's stops: each chapter, then the pages of it that are more than its
 * introduction.
 * @param chapters The chapters.
 * @returns The stops, in reading order.
 */
function stopsOf(chapters: readonly ChapterEntry[]): readonly Stop[] {
  return chapters.flatMap((entry) => [
    { entry },
    ...entry.pages.filter((page) => !isIntroduction(page, entry)).map((page) => ({ entry, page })),
  ])
}

/**
 * The page of the chapter on screen that is being read – the one whose card crosses the
 * band just under the bar, where the reader's eyes are.
 * @param chapter The chapter on screen, or undefined on the contents.
 * @returns The page's slug, or undefined until a page has reached the band, or off a
 * chapter.
 */
function useReadingPage(chapter: ChapterEntry | undefined): string | undefined {
  const [reading, setReading] = useState<string>()

  useEffect(() => {
    if (chapter === undefined) {
      return
    }
    // The band is the top fifth of the screen. A card crossing it is the one being read,
    // and past the last card the last one stays marked.
    const observer = new IntersectionObserver(
      (changes) => {
        const crossing = changes.findLast((change) => change.isIntersecting)
        if (crossing !== undefined) {
          setReading(crossing.target.id)
        }
      },
      { rootMargin: "0px 0px -80% 0px" },
    )
    for (const page of chapter.pages) {
      const section = document.querySelector(`#${CSS.escape(page.slug)}`)
      if (section !== null) {
        observer.observe(section)
      }
    }
    return () => {
      observer.disconnect()
    }
  }, [chapter])

  return chapter === undefined ? undefined : reading
}
