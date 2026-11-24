import {
  Button,
  Card,
  ChatIcon,
  CheckIcon,
  PageActions,
  PageTitle,
  Row,
  SearchField,
  SegmentedControl,
} from "@scouterna/wsj27-campfire-ui"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect, useMemo, type ReactElement } from "react"

import { faqTitle, latestNews, questionCount } from "../../../model/Faq"
import {
  chapterNumber,
  freshChanges,
  freshSince,
  isIntroduction,
  type ChapterEntry,
} from "../../../model/Handbook"
import { changesOf, thisWeek } from "../../../model/news"
import {
  byPlace,
  searchFaq,
  searchHandbook,
  type FaqHit,
  type HandbookResult,
} from "../../../model/search"
import { HandbookOutline } from "../../components/handbookoutline/HandbookOutline"
import { HandbookTile } from "../../components/handbooktile/HandbookTile"
import { RowMoment } from "../../components/rowmoment/RowMoment"
import { useAskQuestion } from "../../use-ask-question"
import { useEditorMenu } from "../../use-editor-menu"
import { useFaq, type FaqView } from "../../use-faq"
import { useHandbook, type HandbookView } from "../../use-handbook"
import { useHandbookMenu } from "../../use-handbook-menu"
import { Changes } from "./Changes"
import { toHandbookSearch, type ContentsView } from "./handbook-search"
import { useSearchText } from "./use-search-text"

import "./ContentsScreen.css"

/**
 * The handbook's front: one search over the handbook and the FAQ alike, every chapter,
 * numbered, with the ones that changed in the last month dated, and every folder of the
 * FAQ – or, chosen instead, every change in either, newest first – and the way to ask
 * what neither answers. Each source is read on its own, so one that cannot be read
 * leaves the other on screen.
 * @returns The screen.
 */
export function ContentsScreen(): ReactElement {
  const handbook = useHandbook()
  const faq = useFaq()
  const editor = useEditorMenu()
  const { copy, menu } = useHandbookMenu(handbook.chapters, faq.folders, { editor })
  const search = useSearchText()
  const handbookResult = useMemo(
    () => searchHandbook(handbook.chapters, search.query),
    [handbook.chapters, search.query],
  )
  const faqHits = useMemo(() => searchFaq(faq.folders, search.query), [faq.folders, search.query])
  useScrollToFaq(faq.folders.length > 0)
  const ask = useAskQuestion("Fråga om WSJ27")
  const view = useView()
  const changes = useMemo(() => {
    const now = new Date()
    return { items: changesOf(handbook.chapters, faq.folders, now), now }
  }, [handbook.chapters, faq.folders])
  const fresh = thisWeek(changes.items, changes.now)

  const isSearching = search.query !== ""
  const total = handbookResult.hits.length + faqHits.length

  return (
    <>
      <PageTitle title="Handbok" />
      <PageActions {...(ask.action !== undefined && { action: ask.action })} menu={menu} />
      <HandbookOutline chapters={handbook.chapters} folders={faq.folders} />
      <SearchField
        label="Sök i handboken och bland frågorna"
        onChange={(event) => {
          search.onText(event.target.value)
        }}
        placeholder="Sök i handboken och bland frågorna"
        trailing={
          isSearching ? (
            <span className="handbook-search-count" aria-hidden="true">
              {hitCount(total)}
            </span>
          ) : undefined
        }
        value={search.text}
      />
      {isSearching ? (
        <Hits
          faq={faq}
          faqHits={faqHits}
          handbook={handbook}
          handbookResult={handbookResult}
          query={search.query}
        />
      ) : (
        <>
          <SegmentedControl
            countSaid={(count) =>
              count === 1
                ? "1 ny eller ändrad den senaste veckan"
                : `${String(count)} nya eller ändrade den senaste veckan`
            }
            counts={views.map((candidate) => (candidate.param === undefined ? undefined : fresh))}
            current={view.index}
            entries={views.map((candidate) => candidate.label)}
            label="Visa"
            onPick={view.pick}
          />
          {views[view.index]?.param === undefined ? (
            <>
              <Chapters view={handbook} />
              <Folders view={faq} />
            </>
          ) : (
            <Changes faq={faq} handbook={handbook} items={changes.items} now={changes.now} />
          )}
        </>
      )}
      {ask.sheet}
      {copy}
    </>
  )
}

/**
 * One way to see the contents: everything, or every change.
 */
type View = {
  /**
   * The segment's label.
   */
  readonly label: string
  /**
   * What the address calls it, absent for everything.
   */
  readonly param?: ContentsView
}

/**
 * The ways to see the contents, in the order the picker offers them.
 */
const views: readonly View[] = [{ label: "Allt" }, { label: "Ändringslogg", param: "andringslogg" }]

/**
 * Which way to see the contents the address says, and the way to choose.
 * @returns The index of the view in force, and how to pick another.
 */
function useView(): { readonly index: number; readonly pick: (index: number) => void } {
  const navigate = useNavigate()
  const named = useRouterState({
    select: (state) => toHandbookSearch(state.location.search).visa,
  })
  return {
    index: Math.max(
      0,
      views.findIndex((candidate) => candidate.param === named),
    ),
    pick: (index) => {
      const next = views.at(index)?.param
      // Replacing, because choosing what to see is not somewhere the reader went.
      void navigate({
        replace: true,
        search: next === undefined ? {} : { visa: next },
        to: "/handbook",
        viewTransition: false,
      })
    },
  }
}

type OfflineLineProps = {
  /**
   * What is on the device, and that it works without coverage.
   */
  readonly children: string
}

/**
 * The promise under a list that it works without coverage, its check in the theme's ink.
 * @param props The promise.
 * @returns The line.
 */
function OfflineLine(props: OfflineLineProps): ReactElement {
  return (
    <p className="handbook-offline">
      <CheckIcon size={14} strokeWidth={2.4} />
      {props.children}
    </p>
  )
}

/**
 * Scrolls the FAQ's folders into view when the address asks for them – the outline's
 * way to the FAQ – once they are there to scroll to.
 * @param isReady Whether the folders are on screen.
 */
function useScrollToFaq(isReady: boolean): void {
  const hash = useRouterState({ select: (state) => state.location.hash })
  useEffect(() => {
    if (isReady && hash === "faq") {
      document.querySelector("#faq")?.scrollIntoView({ block: "start" })
    }
  }, [hash, isReady])
}

/**
 * How many hits there are, in words.
 * @param count The number of hits.
 * @returns The line, such as "4 träffar".
 */
function hitCount(count: number): string {
  if (count === 0) {
    return "Inga träffar"
  }
  return `${String(count)} ${count === 1 ? "träff" : "träffar"}`
}

/**
 * What a source's place on the contents says in each state that has nothing to list.
 */
type StatusLines = {
  /**
   * Said when the source answered with nothing.
   */
  readonly empty: string
  /**
   * Said when the source could not be read.
   */
  readonly failed: string
  /**
   * Said while the first answer is on its way.
   */
  readonly pending: string
}

/**
 * The line for the state a source is in.
 * @param isPending Whether the first answer is still on its way.
 * @param error Why the source could not be read, or null.
 * @param lines What to say in each state.
 * @returns The line.
 */
function statusLine(isPending: boolean, error: Error | null, lines: StatusLines): string {
  if (isPending) {
    return lines.pending
  }
  return error === null ? lines.empty : lines.failed
}

type ChaptersProps = {
  /**
   * The handbook, and the states around it.
   */
  readonly view: HandbookView
}

/**
 * Every chapter as a numbered row – or, in their place, why there are none.
 * @param props The handbook.
 * @returns The list.
 */
function Chapters(props: ChaptersProps): ReactElement {
  const { chapters, error, isPending, refetch } = props.view

  if (isPending || error !== null || chapters.length === 0) {
    return (
      <Card title="Handboken">
        <p className="handbook-status" role="status">
          {statusLine(isPending, error, {
            empty: "Handboken är tom än så länge.",
            failed: "Handboken kunde inte hämtas.",
            pending: "Hämtar handboken …",
          })}
        </p>
        {error === null ? null : <Button label="Försök igen" onPress={refetch} />}
      </Card>
    )
  }

  const now = new Date()

  return (
    <div className="handbook-part">
      <Card title="Handboken">
        {chapters.map((entry) => (
          <Row
            key={entry.chapter.id}
            className="handbook-chapter-row"
            leading={<HandbookTile>{chapterNumber(entry.number)}</HandbookTile>}
            link={{ params: { chapter: entry.chapter.slug }, to: "/handbook/$chapter" }}
            trailing={updatedAt(freshChanges(entry, now)[0])}
          >
            <strong>{entry.chapter.name}</strong>
            <small>{summaryOf(entry)}</small>
          </Row>
        ))}
      </Card>
      <OfflineLine>Handboken är nedladdad och fungerar utan täckning på lägret.</OfflineLine>
    </div>
  )
}

/**
 * What a chapter holds, in the words of its pages' titles – the CMS gives a chapter
 * nothing but its name. A page that only repeats the chapter's name says nothing here.
 * @param entry The chapter.
 * @returns The titles, joined.
 */
function summaryOf(entry: ChapterEntry): string {
  return entry.pages
    .filter((page) => !isIntroduction(page, entry))
    .map((page) => page.title)
    .join(" · ")
}

type FoldersProps = {
  /**
   * The FAQ, and the states around it.
   */
  readonly view: FaqView
}

/**
 * Every folder of the FAQ as a row – or, in their place, why there are none – and the
 * promise under them that they work without coverage.
 * @param props The FAQ.
 * @returns The list, anchored for the outline to scroll to.
 */
function Folders(props: FoldersProps): ReactElement {
  const { error, folders, isPending, refetch } = props.view
  const since = freshSince(new Date())

  return (
    <div className="handbook-faq" id="faq">
      {isPending || error !== null || folders.length === 0 ? (
        <Card title={faqTitle}>
          <p className="handbook-status" role="status">
            {statusLine(isPending, error, {
              empty: "Det finns inga frågor ännu.",
              failed: "Frågorna kunde inte hämtas.",
              pending: "Hämtar frågorna …",
            })}
          </p>
          {error === null ? null : <Button label="Försök igen" onPress={refetch} />}
        </Card>
      ) : (
        <Card title={faqTitle}>
          {folders.map((folder) => (
            <Row
              key={folder.id}
              leading={
                <HandbookTile>
                  <ChatIcon size={20} />
                </HandbookTile>
              }
              link={{ params: { folder: String(folder.id) }, to: "/handbook/faq/$folder" }}
              trailing={updatedAt(latestNews(folder, since))}
            >
              <strong>{folder.name}</strong>
              <small>{questionCount(folder.questions.length)}</small>
            </Row>
          ))}
        </Card>
      )}
      {folders.length > 0 ? (
        <OfflineLine>Frågorna är nedladdade och fungerar utan täckning på lägret.</OfflineLine>
      ) : null}
    </div>
  )
}

/**
 * How many hits the handbook gave, and in how many chapters.
 * @param result What the search of the handbook found.
 * @returns The line, such as "4 träffar i 3 kapitel".
 */
function chapterLine(result: HandbookResult): string {
  return `${hitCount(result.hits.length)} i ${String(result.chapterCount)} kapitel`
}

type HitsProps = {
  /**
   * The FAQ, for saying when it could not be searched.
   */
  readonly faq: FaqView
  /**
   * What the search of the FAQ found.
   */
  readonly faqHits: readonly FaqHit[]
  /**
   * The handbook, for saying when it could not be searched.
   */
  readonly handbook: HandbookView
  /**
   * What the search of the handbook found.
   */
  readonly handbookResult: HandbookResult
  /**
   * The text searched for.
   */
  readonly query: string
}

/**
 * The search's hits, grouped by where they come from – the handbook first, then the
 * FAQ – each leading to its section of its chapter or its question in its folder. A
 * source that could not be read says so rather than looking as if nothing matched.
 * @param props The query, and what it found in each source.
 * @returns The hits, or a line saying there are none.
 */
function Hits(props: HitsProps): ReactElement {
  const handbookHits = props.handbookResult.hits
  const missing = [
    ...(props.handbook.chapters.length === 0 && props.handbook.error !== null ? ["Handboken"] : []),
    ...(props.faq.folders.length === 0 && props.faq.error !== null ? ["Frågorna"] : []),
  ]
  const unread =
    missing.length === 0 ? null : (
      <p className="handbook-status">{missing.join(" och ")} kunde inte hämtas och söktes inte.</p>
    )

  if (handbookHits.length === 0 && props.faqHits.length === 0) {
    return (
      <>
        <p className="handbook-status" role="status">
          Inget i handboken eller bland frågorna matchar ”{props.query}”.
        </p>
        {unread}
      </>
    )
  }

  return (
    <>
      <p className="handbook-spoken" role="status">
        {`${hitCount(handbookHits.length)} i handboken, ${hitCount(props.faqHits.length).toLocaleLowerCase("sv-SE")} bland frågorna`}
      </p>
      {handbookHits.length === 0 ? null : (
        <Card aside={chapterLine(props.handbookResult)} title="I handboken">
          {byPlace(handbookHits, (hit) => hit.page.id).map(({ first: hit, more }) => (
            <Row
              key={hit.page.id}
              className="handbook-hit-row"
              leading={<HandbookTile>{chapterNumber(hit.entry.number)}</HandbookTile>}
              link={{
                hash: hit.page.slug,
                params: { chapter: hit.entry.chapter.slug },
                to: "/handbook/$chapter",
              }}
            >
              <strong>
                {isIntroduction(hit.page, hit.entry) ? hit.entry.chapter.name : hit.page.title}
              </strong>
              <Quote hit={hit} more={more} />
            </Row>
          ))}
        </Card>
      )}
      {props.faqHits.length === 0 ? null : (
        <Card
          aside={hitCount(props.faqHits.length)}
          title={`I ${faqTitle.toLocaleLowerCase("sv-SE")}`}
        >
          {byPlace(props.faqHits, (hit) => hit.question.id).map(({ first: hit, more }) => (
            <Row
              key={hit.question.id}
              className="handbook-hit-row"
              leading={
                <HandbookTile>
                  <ChatIcon size={20} />
                </HandbookTile>
              }
              link={{
                hash: String(hit.question.id),
                params: { folder: String(hit.folder.id) },
                to: "/handbook/faq/$folder",
              }}
            >
              <strong>{hit.question.title}</strong>
              <Quote hit={hit} more={more} />
            </Row>
          ))}
        </Card>
      )}
      {unread}
    </>
  )
}

type QuoteProps = {
  /**
   * The hit, with the text around its match.
   */
  readonly hit: { readonly after: string; readonly before: string; readonly match: string }
  /**
   * How many more hits the place holds after the one quoted.
   */
  readonly more: number
}

/**
 * The text a hit was found in, its match marked, and how many more times the place
 * holds it.
 * @param props The hit, and how many more there are.
 * @returns The quote, as the row's quiet line.
 */
function Quote(props: QuoteProps): ReactElement {
  return (
    <small>
      {props.hit.before}
      <mark>{props.hit.match}</mark>
      {props.hit.after}
      {props.more === 0 ? null : (
        <em className="handbook-hit-more">
          och {props.more === 1 ? "1 träff till" : `${String(props.more)} träffar till`}
        </em>
      )}
    </small>
  )
}

/**
 * When a chapter or a folder last changed in the last month, at its row's end.
 * @param at The moment, as an ISO 8601 instant, or undefined when nothing is news.
 * @returns The moment, or undefined for a row with no news.
 */
function updatedAt(at: string | undefined): ReactElement | undefined {
  return at === undefined ? undefined : <RowMoment at={at} said="Uppdaterad" />
}
