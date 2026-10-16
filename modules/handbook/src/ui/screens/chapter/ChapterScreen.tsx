import { BackIcon, Button, Card, PageActions, PageTitle } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import { useEffect, type ReactElement } from "react"

import {
  chapterAt,
  chapterNumber,
  isIntroduction,
  neighborsOf,
  unseenChanges,
  type ChapterEntry,
  type HandbookPage,
} from "../../../model/Handbook"
import { changedOn } from "../../changed-on"
import { HandbookOutline } from "../../components/handbookoutline/HandbookOutline"
import { RichText } from "../../components/richtext/RichText"
import { useHandbook } from "../../use-handbook"
import { useHandbookMenu } from "../../use-handbook-menu"
import { useLastRead } from "../../use-read-log"

import "./ChapterScreen.css"

export type ChapterScreenProps = {
  /**
   * The section to open at – a page's slug – or undefined for the chapter's top.
   */
  readonly section?: string
  /**
   * The chapter's slug, or a page's, which opens the page's chapter at the page.
   */
  readonly slug: string
}

/**
 * One chapter, read as one document: what changed since the reader last opened it, every
 * page as a card of its own, and the chapters either side of it.
 * @param props The chapter to show, and the section to open at.
 * @returns The screen.
 */
export function ChapterScreen(props: ChapterScreenProps): ReactElement {
  const { chapters, error, isPending, refetch } = useHandbook()
  const found = chapterAt(chapters, props.slug)
  const entry = found?.entry
  const { copy, menu } = useHandbookMenu(chapters, entry)
  const lastRead = useLastRead(entry?.chapter.id)
  const section = found?.page?.slug ?? props.section

  // The section is scrolled to once the content is there to scroll to – on arrival, and
  // again when the handbook arrives after a cold start.
  const isReady = entry !== undefined
  useEffect(() => {
    if (!isReady || section === undefined) {
      return
    }
    document.querySelector(`#${CSS.escape(section)}`)?.scrollIntoView({ block: "start" })
  }, [isReady, section])

  if (isPending) {
    return (
      <>
        <PageTitle title="Handbok" />
        <p className="handbook-chapter-status" role="status">
          Hämtar handboken …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title="Handbok" />
        <p className="handbook-chapter-status" role="status">
          Handboken kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  if (entry === undefined) {
    return (
      <>
        <PageTitle title="Sidan finns inte" />
        <p className="handbook-chapter-status" role="status">
          Kapitlet finns inte i handboken.
        </p>
      </>
    )
  }

  const unseen = unseenChanges(entry, lastRead, new Date())
  const { next, previous } = neighborsOf(chapters, entry.chapter.id)

  return (
    <>
      <PageTitle title={entry.chapter.name} />
      <PageActions menu={menu} />
      <HandbookOutline chapters={chapters} current={entry} />
      {unseen.length === 0 ? null : (
        <aside className="handbook-news" aria-label="Ändringar">
          <p className="handbook-news-head">
            <strong>Uppdaterat {changedOn(unseen[0]?.at ?? "")}</strong>
            {lastRead === undefined ? null : <span>{sinceLine(unseen.length)}</span>}
          </p>
          <ul>
            {unseen.map((change) => (
              <li key={change.at}>{change.text}</li>
            ))}
          </ul>
        </aside>
      )}
      {entry.pages.map((page) => (
        <Section key={page.id} entry={entry} page={page} />
      ))}
      {previous === undefined && next === undefined ? null : (
        <nav aria-label="Andra kapitel" className="handbook-onward">
          {previous === undefined ? <span /> : <Neighbor entry={previous} way="previous" />}
          {next === undefined ? null : <Neighbor entry={next} way="next" />}
        </nav>
      )}
      {copy}
    </>
  )
}

/**
 * How many of the notes are new to this reader.
 * @param count How many notes are unseen.
 * @returns The line, such as "3 ändringar sedan du läste kapitlet".
 */
function sinceLine(count: number): string {
  return `${String(count)} ${count === 1 ? "ändring" : "ändringar"} sedan du läste kapitlet`
}

type SectionProps = {
  /**
   * The chapter the page is in.
   */
  readonly entry: ChapterEntry
  /**
   * The page to draw as a card.
   */
  readonly page: HandbookPage
}

/**
 * One page as a card of its chapter, its title the card's heading, anchored by its slug.
 * A page that only repeats its chapter's name is the chapter's introduction, and its
 * card carries no heading.
 * @param props The page, and its chapter.
 * @returns The card.
 */
function Section(props: SectionProps): ReactElement {
  const isOpening = isIntroduction(props.page, props.entry)

  const content = <RichText blocks={props.page.content} headingLevel={isOpening ? 2 : 3} />

  return (
    <div className="handbook-section" id={props.page.slug}>
      {isOpening ? <Card>{content}</Card> : <Card title={props.page.title}>{content}</Card>}
    </div>
  )
}

type NeighborProps = {
  /**
   * The chapter the link leads to.
   */
  readonly entry: ChapterEntry
  /**
   * Which side of the one on screen it lies.
   */
  readonly way: "next" | "previous"
}

/**
 * A link to the chapter on one side of the one on screen, by its number and its name.
 * @param props The chapter, and which way it lies.
 * @returns The link.
 */
function Neighbor(props: NeighborProps): ReactElement {
  const label = `${chapterNumber(props.entry.number)} · ${props.entry.chapter.name}`
  return (
    <Link
      className={`handbook-neighbor handbook-neighbor-${props.way}`}
      params={{ chapter: props.entry.chapter.slug }}
      to="/handbook/$chapter"
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
