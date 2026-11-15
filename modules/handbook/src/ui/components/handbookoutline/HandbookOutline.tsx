import { expectPush, PageJumps, type OutlineEntry } from "@scouterna/wsj27-campfire-ui"
import { useNavigate, useRouterState, type UseNavigateResult } from "@tanstack/react-router"
import { useCallback, useMemo, type ReactElement } from "react"

import { faqTitle, type FaqFolder } from "../../../model/Faq"
import { isIntroduction, type ChapterEntry, type HandbookPage } from "../../../model/Handbook"

export type HandbookOutlineProps = {
  /**
   * Every chapter, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * The chapter on screen, or undefined off a chapter.
   */
  readonly current?: ChapterEntry
  /**
   * The id of the FAQ folder on screen, or undefined off a folder.
   */
  readonly currentFolder?: number | undefined
  /**
   * Every FAQ folder, in reading order – none while the FAQ has not been read.
   */
  readonly folders: readonly FaqFolder[]
  /**
   * The slug of the page being read, or undefined above the first page and off a chapter.
   */
  readonly reading?: string | undefined
}

/**
 * One stop in the outline, and where it leads: a chapter, a page of one, the FAQ as a
 * whole, or a folder of it.
 */
type Stop =
  | { readonly entry: ChapterEntry; readonly kind: "chapter" }
  | { readonly entry: ChapterEntry; readonly kind: "page"; readonly page: HandbookPage }
  | { readonly folder: FaqFolder; readonly kind: "folder" }
  | { readonly kind: "faq" }

/**
 * The whole handbook as the desktop outline: every chapter, then the FAQ, with only the
 * part on screen opened – a chapter's pages under it, or the FAQ's folders under it – so
 * the reader always sees where they are in all of it without the rest in the way.
 * On a chapter, the page being read is marked as the reader scrolls; a stop on the screen
 * on show scrolls there, as a history entry back returns from, and any other opens its
 * chapter or folder.
 * @param props The chapters and folders, and the one on screen.
 * @returns Nothing – the chrome's outline column draws the stops.
 */
export function HandbookOutline(props: HandbookOutlineProps): ReactElement {
  const navigate = useNavigate()
  const isOnContents = useRouterState({
    select: (state) => state.location.pathname === "/handbook",
  })
  const hash = useRouterState({ select: (state) => state.location.hash })
  const { currentFolder, reading } = props
  const hereId = props.current?.chapter.id
  const stops = useMemo(
    () => stopsOf(props.chapters, props.folders, hereId, currentFolder !== undefined),
    [props.chapters, props.folders, hereId, currentFolder],
  )
  const entries = useMemo(
    (): readonly OutlineEntry[] => stops.map((stop) => entryOf(stop)),
    [stops],
  )

  const marked = stops.findIndex((stop) => isMarked(stop, hereId, reading, currentFolder))
  const fallback =
    marked === -1
      ? stops.findIndex((stop) => stop.kind === "chapter" && stop.entry.chapter.id === hereId)
      : marked

  const onJump = useCallback(
    (index: number): void => {
      const stop = stops.at(index)
      if (stop !== undefined) {
        jump(stop, { currentFolder, hash, hereId, isOnContents }, navigate)
      }
    },
    [currentFolder, hash, hereId, isOnContents, navigate, stops],
  )

  return <PageJumps current={fallback} entries={entries} onJump={onJump} />
}

/**
 * Where the reader is when they pick a stop.
 */
type Place = {
  /**
   * The id of the FAQ folder on screen, if any.
   */
  readonly currentFolder: number | undefined
  /**
   * The passage the address names, or empty for the top of the screen.
   */
  readonly hash: string
  /**
   * The id of the chapter on screen, if any.
   */
  readonly hereId: number | undefined
  /**
   * Whether the contents are on screen.
   */
  readonly isOnContents: boolean
}

/**
 * Goes to a stop. A jump within the screen on show is a scroll, not a change of screen,
 * so it goes without a view transition, and one to where the address already points adds
 * nothing to go back through, so it only scrolls. A jump to another screen cross-fades
 * rather than slides, because the outline pages through one handbook rather than going
 * deeper into it.
 * @param stop The stop picked.
 * @param place Where the reader is.
 * @param navigate The router's navigation.
 */
function jump(stop: Stop, place: Place, navigate: UseNavigateResult<string>): void {
  switch (stop.kind) {
    case "faq": {
      if (place.isOnContents && place.hash === "faq") {
        scrollToFirst("#faq")
        return
      }
      if (!place.isOnContents) {
        expectPush("fade")
      }
      void navigate({ hash: "faq", to: "/handbook", viewTransition: !place.isOnContents })
      return
    }
    case "folder": {
      if (stop.folder.id === place.currentFolder) {
        scrollToFirst(".handbook-faq-question")
        return
      }
      expectPush("fade")
      void navigate({ params: { folder: String(stop.folder.id) }, to: "/handbook/faq/$folder" })
      return
    }
    default: {
      jumpInHandbook(stop, place, navigate)
    }
  }
}

/**
 * Goes to a chapter, or to a page of one, by the same rule as every other stop.
 * @param stop The chapter's or the page's stop.
 * @param place Where the reader is.
 * @param navigate The router's navigation.
 */
function jumpInHandbook(
  stop: Extract<Stop, { readonly kind: "chapter" | "page" }>,
  place: Place,
  navigate: UseNavigateResult<string>,
): void {
  const isHere = stop.entry.chapter.id === place.hereId
  const passage = stop.kind === "page" ? stop.page.slug : ""
  if (isHere && passage === place.hash) {
    scrollToFirst(passage === "" ? ".handbook-section" : `#${CSS.escape(passage)}`)
    return
  }
  if (!isHere) {
    expectPush("fade")
  }
  void navigate({
    ...(passage !== "" && { hash: passage }),
    params: { chapter: stop.entry.chapter.slug },
    to: "/handbook/$chapter",
    viewTransition: !isHere,
  })
}

/**
 * Whether a stop is where the reader is: the page being read, the chapter itself above
 * its first page or on its introduction, or the folder on screen.
 * @param stop The stop.
 * @param hereId The id of the chapter on screen, if any.
 * @param reading The slug of the page being read, if any.
 * @param folderId The id of the folder on screen, if any.
 * @returns True for the stop to mark.
 */
function isMarked(
  stop: Stop,
  hereId: number | undefined,
  reading: string | undefined,
  folderId: number | undefined,
): boolean {
  switch (stop.kind) {
    case "chapter": {
      return reading === undefined && stop.entry.chapter.id === hereId
    }
    case "page": {
      return reading !== undefined && stop.page.slug === reading
    }
    case "folder": {
      return stop.folder.id === folderId
    }
    case "faq": {
      return false
    }
  }
}

/**
 * What the outline says for a stop – a chapter and the FAQ at the top level, a page and
 * a folder under them.
 * @param stop The stop.
 * @returns The outline's entry.
 */
function entryOf(stop: Stop): OutlineEntry {
  switch (stop.kind) {
    case "chapter": {
      return stop.entry.chapter.name
    }
    case "page": {
      return { isNested: true, label: stop.page.title }
    }
    case "folder": {
      return { isNested: true, label: stop.folder.name }
    }
    case "faq": {
      return faqTitle
    }
  }
}

/**
 * The outline's stops: each chapter, followed for the chapter on screen by its pages that
 * are more than its introduction, and last the FAQ, when it has folders, followed by them
 * while a folder is on screen.
 * @param chapters The chapters.
 * @param folders The FAQ's folders.
 * @param hereId The id of the chapter on screen, whose pages are listed, if any.
 * @param isInFaq Whether a folder is on screen, so the folders are listed.
 * @returns The stops, in reading order.
 */
function stopsOf(
  chapters: readonly ChapterEntry[],
  folders: readonly FaqFolder[],
  hereId: number | undefined,
  isInFaq: boolean,
): readonly Stop[] {
  const handbook = chapters.flatMap((entry): Stop[] =>
    entry.chapter.id === hereId
      ? [
          { entry, kind: "chapter" },
          ...entry.pages
            .filter((page) => !isIntroduction(page, entry))
            .map((page): Stop => ({ entry, kind: "page", page })),
        ]
      : [{ entry, kind: "chapter" }],
  )
  if (folders.length === 0) {
    return handbook
  }
  if (!isInFaq) {
    return [...handbook, { kind: "faq" }]
  }
  return [
    ...handbook,
    { kind: "faq" },
    ...folders.map((folder): Stop => ({ folder, kind: "folder" })),
  ]
}

/**
 * Scrolls the first element a selector matches to the top of the reading area.
 * @param selector The element's selector.
 */
function scrollToFirst(selector: string): void {
  document.querySelector(selector)?.scrollIntoView({ block: "start" })
}
