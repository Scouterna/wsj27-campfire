import {
  BookIcon,
  Button,
  DownloadIcon,
  Logo,
  OverflowMenu,
  PageOutline,
  Sheet,
  ThemeScope,
  useTheme,
  type OutlineEntry,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import { useNavigate, useRouterState, type UseNavigateResult } from "@tanstack/react-router"
import { memo, useEffect, useMemo, useRef, useState, type ReactElement } from "react"

import { documentsOf } from "../../../model/documents"
import { isIntroduction, type ChapterEntry } from "../../../model/Handbook"
import { changesOf } from "../../../model/news"
import { ChangeGroups } from "../../components/changegroups/ChangeGroups"
import { PageSection } from "../../components/pagesection/PageSection"
import { downloadDocument } from "../../pdf/download-document"
import { usePublicHandbook } from "../../use-handbook"
import { useHandbookMenu } from "../../use-handbook-menu"
import { useReadingAnchor } from "../../use-reading-page"
import { toPublicSearch } from "./public-search"

import "./PublicHandbookScreen.css"

/**
 * The color the public handbook always wears – its mark, its page, and the documents it
 * hands out – whoever reads it. A reader here has no unit to take a color from, and one
 * who has signed in before keeps their own color for the application, because nothing
 * here is remembered.
 */
const publicTheme: Theme = "red"

/**
 * The handbook anyone may read, without signing in – the public pages as one web page,
 * set as the application sets a chapter, with its contents beside it to jump by and the
 * handbook and its appendices to download as PDFs. `?pdf` in the address opens the print
 * dialog as soon as it is all on screen, so a link can hand out the paper copy directly.
 * @returns The screen.
 */
export function PublicHandbookScreen(): ReactElement {
  const handbook = usePublicHandbook()
  const isPdfAsked = useRouterState({
    select: (state) => toPublicSearch(state.location.search).pdf === true,
  })
  const isReady = !handbook.isPending && handbook.chapters.length > 0

  useEffect(() => {
    const before = document.title
    document.title = "Handboken – Den svenska kontingenten för WSJ27"
    return () => {
      document.title = before
    }
  }, [])

  usePrintOnce(isPdfAsked && isReady)

  return (
    <ThemeScope theme={publicTheme}>
      {isReady ? (
        <PublicHandbook chapters={handbook.chapters} />
      ) : (
        <div className="public-status" role="status">
          {handbook.error === null ? (
            <p>{handbook.isPending ? "Hämtar handboken …" : "Handboken är tom än så länge."}</p>
          ) : (
            <>
              <p>Handboken kunde inte hämtas.</p>
              <Button label="Försök igen" onPress={handbook.refetch} />
            </>
          )}
        </div>
      )}
    </ThemeScope>
  )
}

/**
 * One part of the page the contents lead to – a chapter, or the change log – with what
 * stands under it.
 */
type Part = {
  /**
   * The id of the part's heading on the page.
   */
  readonly anchor: string
  readonly label: string
  /**
   * What stands under the part and has a name of its own: the chapter's pages, but for
   * its introduction.
   */
  readonly named: readonly { readonly anchor: string; readonly label: string }[]
  /**
   * The ids of everything under the part that the reader can be at, named or not.
   */
  readonly read: readonly string[]
}

/**
 * The id of a chapter's heading on the page.
 * @param entry The chapter.
 * @returns The id.
 */
function chapterId(entry: ChapterEntry): string {
  return `kapitel-${entry.chapter.slug}`
}

/**
 * The FAQ's folders the printed copy and the documents are given: none, because the
 * public handbook is the handbook alone. Held still, so the menu is not rebuilt on every
 * render.
 */
const noFolders: readonly never[] = []

/**
 * The id of the change log on the page.
 */
const changeLogId = "andringslogg"

/**
 * The page's parts, in reading order: every chapter, then the change log when it lists
 * anything.
 * @param chapters The chapters.
 * @param now The moment the change log is judged against.
 * @returns The parts.
 */
function partsOf(chapters: readonly ChapterEntry[], now: Date): Part[] {
  const hasChanges = changesOf(chapters, noFolders, now).length > 0
  return [
    ...chapters.map((entry) => ({
      anchor: chapterId(entry),
      label: entry.chapter.name,
      named: entry.pages
        .filter((page) => !isIntroduction(page, entry))
        .map((page) => ({ anchor: page.slug, label: page.title })),
      read: entry.pages.map((page) => page.slug),
    })),
    ...(hasChanges
      ? [{ anchor: changeLogId, label: "Ändringslogg", named: [], read: [changeLogId] }]
      : []),
  ]
}

/**
 * The page's contents as an outline draws them.
 */
type Contents = {
  /**
   * The id each entry leads to, in the entries' order.
   */
  readonly anchors: readonly string[]
  /**
   * Which entry the reader is at, or -1 above the first.
   */
  readonly current: number
  readonly entries: readonly OutlineEntry[]
}

/**
 * The contents for an outline: every part, with what the open ones hold under them, and
 * the entry the reader is at – what is being read where its part is open, and otherwise
 * the part itself.
 * @param parts The page's parts.
 * @param open The part to open, by its place, or every part.
 * @param reading The id of what is being read, if anything is yet.
 * @returns The entries, where each leads, and the current one.
 */
function contentsOf(
  parts: readonly Part[],
  open: number | "all",
  reading: string | undefined,
): Contents {
  const stops = parts.flatMap((part, index) => [
    { anchor: part.anchor, isNested: false, label: part.label },
    ...(open === "all" || open === index
      ? part.named.map((named) => ({ ...named, isNested: true }))
      : []),
  ])
  const at = stops.findIndex((stop) => stop.anchor === reading)
  const part = parts.find((candidate) => reading !== undefined && candidate.read.includes(reading))
  return {
    anchors: stops.map((stop) => stop.anchor),
    current: at === -1 ? stops.findIndex((stop) => stop.anchor === part?.anchor) : at,
    entries: stops.map(({ isNested, label }) => ({ isNested, label })),
  }
}

type PublicHandbookProps = {
  /**
   * The public chapters, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
}

/**
 * Takes the reader to a place on the page, and names it in the address so they can hand
 * it on.
 * @param anchor The place's id, or undefined for an entry that leads nowhere.
 * @param navigate The router's way to change the address.
 */
function jumpTo(anchor: string | undefined, navigate: UseNavigateResult<string>): void {
  if (anchor === undefined) {
    return
  }
  // The router scrolls when the address changes, so the place already in the address is
  // scrolled to here.
  if (location.hash === `#${anchor}`) {
    document.querySelector(`#${CSS.escape(anchor)}`)?.scrollIntoView({ block: "start" })
    return
  }
  // Through the router rather than by scrolling here, because the router scrolls to
  // whatever place an address names whenever the address changes, and two scrolls for one
  // jump fight each other. The entry is replaced, so the way back leaves the page rather
  // than retracing every jump on it.
  void navigate({
    hash: anchor,
    hashScrollIntoView: { block: "start" },
    replace: true,
    resetScroll: false,
    search: (search) => search,
    to: "/public/handbook/leaders",
    viewTransition: false,
  })
}

/**
 * The page itself, once the handbook is there to show.
 * @param props The chapters.
 * @returns The page.
 */
function PublicHandbook(props: PublicHandbookProps): ReactElement {
  const { chapters } = props
  const theme = useTheme()
  const navigate = useNavigate()
  const { copy, menu } = useHandbookMenu(chapters, noFolders)
  const [isContentsOpen, setContentsOpen] = useState(false)
  const saving = useSaving()

  // One moment for as long as the page is open, so the content is not drawn again each
  // time the reader scrolls from one part into the next.
  const now = useMemo(() => new Date(), [])
  const parts = useMemo(() => partsOf(chapters, now), [chapters, now])
  const anchors = useMemo(() => parts.flatMap((part) => part.read), [parts])
  // At the top of the page nothing has reached the reading band yet, and what the
  // reader is at is the first thing on it – said from the start, so the contents do not
  // open their first part a moment after the page has loaded.
  const reading = useReadingAnchor(anchors) ?? anchors[0]
  const here = parts.findIndex((part) => reading !== undefined && part.read.includes(reading))

  // Beside the page the contents are the application's outline: every part, and under
  // the one being read what it holds, so the list stays short enough to take in. In the
  // sheet a narrow window opens them in, every part is open, because the sheet scrolls
  // and is there to jump from.
  const beside = contentsOf(parts, here, reading)
  const inSheet = contentsOf(parts, "all", reading)

  useScrollToHash()

  const jump = (anchor: string | undefined): void => {
    setContentsOpen(false)
    jumpTo(anchor, navigate)
  }

  const [whole] = documentsOf(chapters)

  return (
    <div className="public-handbook">
      <header className="public-header">
        <Logo />
        <div className="public-heading">
          <h1>Handboken</h1>
          {whole === undefined ? null : (
            <Button
              icon={<DownloadIcon size={18} />}
              label={saving.isSaving ? "Skapar PDF …" : "Ladda ner som PDF"}
              onPress={() => {
                saving.save(async () => downloadDocument(whole, theme))
              }}
            />
          )}
          <OverflowMenu items={menu} />
        </div>
        {saving.hasFailed ? (
          <p className="public-failed" role="status">
            PDF:en gick inte att skapa. Försök igen.
          </p>
        ) : null}
      </header>

      <div className="public-columns">
        <PublicContent chapters={chapters} now={now} />
        <div className="public-outline">
          <PageOutline
            current={beside.current}
            entries={beside.entries}
            label="Innehåll"
            onSelect={(index) => {
              jump(beside.anchors.at(index))
            }}
          />
        </div>
      </div>

      <div className="public-tools">
        <Button
          icon={<BookIcon size={18} />}
          label="Innehåll"
          onPress={() => {
            setContentsOpen(true)
          }}
          variant="secondary"
        />
      </div>
      <Sheet
        isOpen={isContentsOpen}
        onClose={() => {
          setContentsOpen(false)
        }}
        title="Innehåll"
      >
        <PageOutline
          current={inSheet.current}
          entries={inSheet.entries}
          label="Handboken"
          onSelect={(index) => {
            jump(inSheet.anchors.at(index))
          }}
        />
      </Sheet>
      {copy}
    </div>
  )
}

type PublicContentProps = PublicHandbookProps & {
  /**
   * The moment the pages' changes are aged against.
   */
  readonly now: Date
}

/**
 * What the page is there to be read for: every chapter under its name, each page a card
 * as on the chapter's own screen in the application, and last what has changed, as the
 * application's change log lists it – each change leading to its page here.
 * @param props The chapters.
 * @returns The content.
 */
const PublicContent = memo(function PublicContent(props: PublicContentProps): ReactElement {
  const { chapters, now } = props
  const changes = changesOf(chapters, noFolders, now)
  return (
    <main className="public-content">
      {chapters.map((entry) => (
        <section key={entry.chapter.id} className="public-part">
          <h2 className="public-part-title" id={chapterId(entry)}>
            {entry.chapter.name}
          </h2>
          {entry.pages.map((page) => (
            <PageSection key={page.id} entry={entry} level={3} now={now} page={page} />
          ))}
        </section>
      ))}
      {changes.length === 0 ? null : (
        <section className="public-part" id={changeLogId}>
          <h2 className="public-part-title">Ändringslogg</h2>
          <ChangeGroups
            items={changes}
            level={3}
            now={now}
            pageLink={(item) => ({ hash: item.page.slug, to: "/public/handbook/leaders" })}
          />
        </section>
      )}
    </main>
  )
})

/**
 * Making a file, one at a time, and whether the last one failed.
 */
type Saving = {
  /**
   * Whether the last file could not be made.
   */
  readonly hasFailed: boolean
  /**
   * Whether a file is being made right now.
   */
  readonly isSaving: boolean
  /**
   * Makes a file, unless one is already being made.
   */
  readonly save: (make: () => Promise<void>) => void
}

/**
 * Keeps track of a file being made, so its button can say so and a failure is not silent.
 * @returns The state, and the way to make a file.
 */
function useSaving(): Saving {
  const [state, setState] = useState<"failed" | "idle" | "saving">("idle")
  // Beside the state, because two presses in one frame both see the state as it was.
  const making = useRef(false)
  return {
    hasFailed: state === "failed",
    isSaving: state === "saving",
    save: (make) => {
      if (making.current) {
        return
      }
      making.current = true
      setState("saving")
      void (async () => {
        const outcome = await attempt(make)
        making.current = false
        setState(outcome)
      })()
    },
  }
}

/**
 * Makes a file and says how it went.
 * @param make Makes the file.
 * @returns Idle once it is made, or that it failed.
 */
async function attempt(make: () => Promise<void>): Promise<"failed" | "idle"> {
  try {
    await make()
    return "idle"
  } catch {
    return "failed"
  }
}

/**
 * Scrolls to the place the address names, once – the page is there to scroll in by the
 * time this runs, which the browser's own jump on arrival was too early for.
 */
function useScrollToHash(): void {
  useEffect(() => {
    let anchor = location.hash.slice(1)
    try {
      anchor = decodeURIComponent(anchor)
    } catch {
      // An address that is not well-formed names no place.
      return
    }
    if (anchor !== "") {
      document.querySelector(`#${CSS.escape(anchor)}`)?.scrollIntoView({ block: "start" })
    }
  }, [])
}

/**
 * Opens the print dialog once, when it is first asked for – after the fonts have loaded
 * and the copy has been laid out, so the paper gets the display face rather than its
 * fallback. A dialog the reader closed stays closed.
 * @param isAsked Whether the dialog should open now.
 */
function usePrintOnce(isAsked: boolean): void {
  const printed = useRef(false)
  useEffect(() => {
    if (!isAsked || printed.current) {
      return
    }
    let isCurrent = true
    async function printWhenSet(): Promise<void> {
      await document.fonts.ready
      if (!isCurrent || printed.current) {
        return
      }
      printed.current = true
      // Two frames: the first commits what the fonts changed, the second has it laid out.
      requestAnimationFrame(printNextFrame)
    }
    void printWhenSet()
    return () => {
      isCurrent = false
    }
  }, [isAsked])
}

/**
 * Opens the print dialog on the frame after this one.
 */
function printNextFrame(): void {
  requestAnimationFrame(() => {
    print()
  })
}
