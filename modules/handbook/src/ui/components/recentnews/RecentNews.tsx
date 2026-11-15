import { Card, ChatIcon, Row, type LinkTarget } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { chapterNumber } from "../../../model/Handbook"
import { newsAt, type NewsItem } from "../../../model/news"
import { HandbookTile } from "../handbooktile/HandbookTile"
import { RowMoment } from "../rowmoment/RowMoment"

import "./RecentNews.css"

/**
 * Where a changed page is read, for a row to lead to.
 */
export type PageLink = (item: Extract<NewsItem, { kind: "page" }>) => LinkTarget

/**
 * Where a changed page is read in the application: its chapter's screen, at the page.
 * @param item The changed page.
 * @returns The link.
 */
function chapterLink(item: Extract<NewsItem, { kind: "page" }>): LinkTarget {
  return {
    hash: item.page.slug,
    params: { chapter: item.entry.chapter.slug },
    to: "/handbook/$chapter",
  }
}

export type RecentNewsProps = {
  /**
   * What changed, newest first.
   */
  readonly items: readonly NewsItem[]
  /**
   * The level of the card's heading, under a heading of the screen's own.
   */
  readonly level?: 2 | 3 | undefined
  /**
   * Where a changed page's row leads, where that is not its chapter's screen in the
   * application.
   */
  readonly pageLink?: PageLink | undefined
  /**
   * The card's heading.
   */
  readonly title: string
}

/**
 * What changed, newest first, as a card of its own: a row each, as the contents' rows
 * are, opening where it is – a page under its chapter's number with the editor's note,
 * and a question under the FAQ's mark with whether it is new or changed.
 * @param props The items, and the heading over them.
 * @returns The card.
 */
export function RecentNews(props: RecentNewsProps): ReactElement {
  return (
    <Card level={props.level} title={props.title}>
      {props.items.map((item) => (
        <NewsRow
          key={
            item.kind === "page"
              ? `page-${String(item.page.id)}`
              : `question-${String(item.question.id)}`
          }
          item={item}
          pageLink={props.pageLink ?? chapterLink}
        />
      ))}
    </Card>
  )
}

type NewsRowProps = {
  /**
   * The page or the question.
   */
  readonly item: NewsItem
  /**
   * Where a changed page's row leads.
   */
  readonly pageLink: PageLink
}

/**
 * One item, as a row leading to where it is: what it is, then where it sits – its chapter
 * or its folder, first so a note cut short never loses it – and what changed, and when.
 * @param props The item.
 * @returns The row.
 */
function NewsRow(props: NewsRowProps): ReactElement {
  const { item } = props
  if (item.kind === "page") {
    return (
      <Row
        className="recent-news-row"
        leading={<HandbookTile>{chapterNumber(item.entry.number)}</HandbookTile>}
        link={props.pageLink(item)}
        trailing={<RowMoment at={newsAt(item)} said="Uppdaterad" />}
      >
        <strong>{item.page.title}</strong>
        <small>{`${item.entry.chapter.name} · ${item.note.text}`}</small>
      </Row>
    )
  }
  const isNew = item.news.kind === "new"
  return (
    <Row
      className="recent-news-row"
      leading={
        <HandbookTile>
          <ChatIcon size={20} />
        </HandbookTile>
      }
      link={{
        hash: String(item.question.id),
        params: { folder: String(item.folder.id) },
        to: "/handbook/faq/$folder",
      }}
      trailing={<RowMoment at={newsAt(item)} said={isNew ? "Ny" : "Uppdaterad"} />}
    >
      <strong>{item.question.title}</strong>
      <small>{`${item.folder.name} · ${isNew ? "Ny fråga" : "Svaret är ändrat"}`}</small>
    </Row>
  )
}
