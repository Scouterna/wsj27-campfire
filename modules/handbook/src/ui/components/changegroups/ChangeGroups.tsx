import type { ReactElement } from "react"

import { byAge, type NewsAge, type NewsItem } from "../../../model/news"
import { RecentNews, type PageLink } from "../recentnews/RecentNews"

export type ChangeGroupsProps = {
  /**
   * Every change, newest first.
   */
  readonly items: readonly NewsItem[]
  /**
   * The level of each group's heading, under a heading of the screen's own.
   */
  readonly level?: 2 | 3
  /**
   * The moment the changes' ages are counted from.
   */
  readonly now: Date
  /**
   * Where a changed page's row leads, where that is not its chapter's screen in the
   * application.
   */
  readonly pageLink?: PageLink
}

/**
 * Each group's heading.
 */
const headings: Readonly<Record<NewsAge, string>> = {
  day: "Senaste dygnet",
  month: "Senaste månaden",
  older: "Äldre",
  week: "Senaste veckan",
}

/**
 * Changes as a change log: a card for each stretch of time that holds any, newest first,
 * so the reader scrolls back only as far as they care to.
 * @param props The changes, and the moment their ages are counted from.
 * @returns The cards – none for no changes.
 */
export function ChangeGroups(props: ChangeGroupsProps): ReactElement {
  return (
    <>
      {byAge(props.items, props.now).map((group) => (
        <RecentNews
          key={group.age}
          items={group.items}
          level={props.level}
          pageLink={props.pageLink}
          title={headings[group.age]}
        />
      ))}
    </>
  )
}
