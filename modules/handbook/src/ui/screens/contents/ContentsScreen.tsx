import {
  Button,
  Card,
  Chip,
  PageActions,
  PageTitle,
  Row,
  SearchField,
} from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import { useMemo, type ReactElement } from "react"

import {
  chapterNumber,
  isIntroduction,
  unseenChanges,
  type ChapterEntry,
} from "../../../model/Handbook"
import { searchHandbook, type SearchHit, type SearchResult } from "../../../model/search"
import { HandbookOutline } from "../../components/handbookoutline/HandbookOutline"
import { useHandbook } from "../../use-handbook"
import { useHandbookMenu } from "../../use-handbook-menu"
import { useReadLog } from "../../use-read-log"
import { useSearchText } from "./use-search-text"

import "./ContentsScreen.css"

/**
 * The handbook's front: a search over the whole handbook, and every chapter, numbered,
 * with the ones that changed since this reader last opened them marked.
 * @returns The screen.
 */
export function ContentsScreen(): ReactElement {
  const { chapters, error, isPending, refetch } = useHandbook()
  const { copy, menu } = useHandbookMenu(chapters)
  const search = useSearchText()
  const result = useMemo(() => searchHandbook(chapters, search.query), [chapters, search.query])

  const heading = (
    <>
      <PageTitle title="Handbok" />
      <PageActions menu={menu} />
      <HandbookOutline chapters={chapters} />
    </>
  )

  if (isPending) {
    return (
      <>
        {heading}
        <p className="handbook-status" role="status">
          Hämtar handboken …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        {heading}
        <p className="handbook-status" role="status">
          Handboken kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  const isSearching = search.query !== ""

  return (
    <>
      {heading}
      <div className="handbook-search">
        <SearchField
          label="Sök i handboken"
          onChange={(event) => {
            search.onText(event.target.value)
          }}
          placeholder="Sök i handboken"
          trailing={
            isSearching ? (
              <span className="handbook-search-count" aria-hidden="true">
                {countLine(result)}
              </span>
            ) : undefined
          }
          value={search.text}
        />
      </div>
      {isSearching ? (
        <Hits query={search.query} result={result} />
      ) : (
        <Chapters chapters={chapters} />
      )}
      {copy}
    </>
  )
}

/**
 * How many hits a search found, and in how many chapters.
 * @param result What the search found.
 * @returns The line, such as "4 träffar i 3 kapitel".
 */
function countLine(result: SearchResult): string {
  const hits = result.hits.length
  if (hits === 0) {
    return "Inga träffar"
  }
  const noun = hits === 1 ? "träff" : "träffar"
  return `${String(hits)} ${noun} i ${String(result.chapterCount)} kapitel`
}

type ChaptersProps = {
  /**
   * The chapters, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
}

/**
 * Every chapter as a numbered row, then the note that the handbook reads offline.
 * @param props The chapters.
 * @returns The list.
 */
function Chapters(props: ChaptersProps): ReactElement {
  const lastRead = useReadLog()

  if (props.chapters.length === 0) {
    return (
      <p className="handbook-status" role="status">
        Handboken är tom än så länge.
      </p>
    )
  }

  const now = new Date()

  return (
    <>
      <Card>
        {props.chapters.map((entry) => (
          <Row
            key={entry.chapter.id}
            className="handbook-chapter-row"
            leading={
              <span className="handbook-number" aria-hidden="true">
                {chapterNumber(entry.number)}
              </span>
            }
            link={{ params: { chapter: entry.chapter.slug }, to: "/handbook/$chapter" }}
          >
            <strong>{entry.chapter.name}</strong>
            <small>{summaryOf(entry)}</small>
            {unseenChanges(entry, lastRead(entry.chapter.id), now).length > 0 ? (
              <span className="handbook-updated">
                <Chip tone="warning">Uppdaterad</Chip>
              </span>
            ) : null}
          </Row>
        ))}
      </Card>
      <p className="handbook-offline">
        Hela handboken är nedladdad – den fungerar utan täckning på lägret.
      </p>
    </>
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

/**
 * Where a hit is: its chapter, and its page where the page is more than the chapter's
 * introduction – two pages can share a passage, and the page is what tells them apart.
 * @param hit The hit.
 * @returns The line over the quote, such as "Kapitel 03 · Resa · Adresser".
 */
function eyebrowOf(hit: SearchHit): string {
  const chapter = `Kapitel ${chapterNumber(hit.entry.number)} · ${hit.entry.chapter.name}`
  return isIntroduction(hit.page, hit.entry) ? chapter : `${chapter} · ${hit.page.title}`
}

type HitsProps = {
  /**
   * The text searched for.
   */
  readonly query: string
  /**
   * What the search found.
   */
  readonly result: SearchResult
}

/**
 * The search's hits, each leading to its section of its chapter.
 * @param props The query, and what it found.
 * @returns The hits, or a line saying there are none.
 */
function Hits(props: HitsProps): ReactElement {
  if (props.result.hits.length === 0) {
    return (
      <p className="handbook-status" role="status">
        Inget i handboken matchar ”{props.query}”.
      </p>
    )
  }

  return (
    <>
      <p className="handbook-spoken" role="status">
        {countLine(props.result)}
      </p>
      <Card>
        <ol className="handbook-hits" aria-label="Träffar">
          {props.result.hits.map((hit, index) => (
            <li key={index}>
              <Link
                className="handbook-hit"
                hash={hit.page.slug}
                params={{ chapter: hit.entry.chapter.slug }}
                to="/handbook/$chapter"
              >
                <small>{eyebrowOf(hit)}</small>
                <span>
                  {hit.before}
                  <mark>{hit.match}</mark>
                  {hit.after}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
