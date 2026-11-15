import { BackIcon, expectPop, setNavDirection } from "@scouterna/wsj27-campfire-ui"
import { Link, useRouter, useRouterState } from "@tanstack/react-router"
import { useEffect, type ReactElement } from "react"

import type { FaqFolder } from "../../../model/Faq"
import { chapterNumber, type ChapterEntry } from "../../../model/Handbook"
import { besideStop, readingOrder, stopKey, type ReadingStop } from "../../../model/reading"

import "./HandbookOnward.css"

export type HandbookOnwardProps = {
  /**
   * Every chapter, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * Every folder of the FAQ, in reading order, read after the chapters.
   */
  readonly folders: readonly FaqFolder[]
  /**
   * The chapter or folder on screen.
   */
  readonly here: ReadingStop
}

/**
 * The chapters and folders either side of the one on screen, under its last page, for
 * reading the handbook straight through – the chapters, then the FAQ's folders.
 * @param props Every chapter and folder, and the one on screen.
 * @returns The links, or nothing where there is nowhere to go.
 */
export function HandbookOnward(props: HandbookOnwardProps): ReactElement | null {
  const from = stopKey(props.here)
  const { next, previous } = besideStop(readingOrder(props.chapters, props.folders), from)
  const index = useRouterState({ select: (state) => state.location.state.__TSR_index })
  const entry = useRouterState({ select: (state) => state.location.state.__TSR_key })

  // A "next" link said where its push would land. If this is that entry, it is noted as
  // reached from there, by the entry's own key, which no later entry at the same place
  // in the history shares. Anywhere else the word is spent – the push never happened, or
  // the reader went another way first.
  useEffect(() => {
    if (awaited.push?.index === index && entry !== undefined) {
      reachedFrom.set(entry, awaited.push.from)
    }
    delete awaited.push
  }, [entry, index])

  if (previous === undefined && next === undefined) {
    return null
  }
  return (
    <nav aria-label="Läs vidare" className="handbook-onward">
      {previous === undefined ? null : (
        <Neighbor entry={entry} from={from} index={index} stop={previous} way="previous" />
      )}
      {next === undefined ? null : (
        <Neighbor entry={entry} from={from} index={index} stop={next} way="next" />
      )}
    </nav>
  )
}

/**
 * Which stop each history entry a "next" link pushed was reached from, by the entry's
 * own key, so the "previous" link on it can go back to that entry rather than push the
 * stop anew. In memory, so after a reload "previous" pushes, as it does on a stop reached
 * any other way.
 */
const reachedFrom = new Map<string, string>()

/**
 * The push a "next" link just asked for: the stop it was pressed on, and the place in the
 * history its entry will take. Held only until the next handbook screen has looked at it.
 */
const awaited: { push?: { readonly from: string; readonly index: number } } = {}

type NeighborProps = {
  /**
   * The key of the history entry on screen, where the router gave it one.
   */
  readonly entry: string | undefined
  /**
   * The key of the stop on screen.
   */
  readonly from: string
  /**
   * The place of the entry on screen in the history.
   */
  readonly index: number
  /**
   * The chapter or folder the link leads to.
   */
  readonly stop: ReadingStop
  /**
   * Which side of the one on screen it lies.
   */
  readonly way: "next" | "previous"
}

/**
 * A link to the chapter or folder on one side of the one on screen – a chapter by its
 * number and its name, a folder by its name. The previous one slides in from the side it
 * lies on, and when the reader came from it by its "next" link, the link goes back to
 * where they were rather than push it again.
 * @param props The stop, which way it lies, and the key of the one on screen.
 * @returns The link.
 */
function Neighbor(props: NeighborProps): ReactElement {
  const router = useRouter()
  const { entry, index, stop } = props
  const key = stopKey(stop)
  const label =
    stop.kind === "chapter"
      ? `${chapterNumber(stop.entry.number)} · ${stop.entry.chapter.name}`
      : stop.folder.name
  const target =
    stop.kind === "chapter"
      ? ({ params: { chapter: stop.entry.chapter.slug }, to: "/handbook/$chapter" } as const)
      : ({ params: { folder: String(stop.folder.id) }, to: "/handbook/faq/$folder" } as const)
  return (
    <Link
      className={`handbook-neighbor handbook-neighbor-${props.way}`}
      data-nav={props.way === "previous" ? "back" : undefined}
      onClick={(event) => {
        // A press that opens the stop elsewhere – a new tab, a new window – pushes
        // nothing here, and is left to the browser.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return
        }
        if (props.way === "next") {
          awaited.push = { from: props.from, index: index + 1 }
          return
        }
        if (entry !== undefined && reachedFrom.get(entry) === key) {
          event.preventDefault()
          setNavDirection("back")
          expectPop()
          router.history.back()
        }
      }}
      {...target}
    >
      {props.way === "previous" ? <BackIcon size={16} strokeWidth={2.2} /> : null}
      <span>
        <small>{props.way === "previous" ? "Föregående" : "Nästa"}</small>
        {label}
      </span>
      {props.way === "next" ? <BackIcon size={16} strokeWidth={2.2} /> : null}
    </Link>
  )
}
