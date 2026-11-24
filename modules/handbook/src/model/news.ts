import { datedOf, type FaqFolder, type FaqQuestion, type QuestionNews } from "./Faq"
import { freshSince, type ChapterEntry, type HandbookPage } from "./Handbook"

/**
 * Something new or changed lately, in the handbook or in the FAQ – a page an editor wrote
 * a note on or published again, or a question published or saved again.
 */
export type NewsItem =
  | {
      /**
       * When the page changed, as an ISO 8601 instant in UTC.
       */
      readonly at: string
      /**
       * The page's chapter.
       */
      readonly entry: ChapterEntry
      readonly kind: "page"
      readonly page: HandbookPage
      /**
       * What the editor said changed, for a change they wrote a note on.
       */
      readonly text?: string
    }
  | {
      /**
       * The question's folder.
       */
      readonly folder: FaqFolder
      readonly kind: "question"
      /**
       * Whether the question is new or changed, and when.
       */
      readonly news: QuestionNews
      readonly question: FaqQuestion
    }

/**
 * When a news item happened.
 * @param item The item.
 * @returns The moment, as an ISO 8601 instant in UTC.
 */
export function newsAt(item: NewsItem): string {
  return item.kind === "page" ? item.at : item.news.at
}

/**
 * A change to a page of the handbook.
 */
export type PageNews = Extract<NewsItem, { readonly kind: "page" }>

/**
 * Every change to the handbook's pages, newest first. A page's note counts for as long as
 * it stands, because an editor wrote it to say the page changed. A page published again
 * without a note is news for a month, because a change nobody described may be no more
 * than a corrected typo.
 * @param chapters The chapters.
 * @param now The moment an unnoted change's month is counted to.
 * @returns The changes, newest first.
 */
export function pageChangesOf(chapters: readonly ChapterEntry[], now: Date): readonly PageNews[] {
  const since = freshSince(now)
  return chapters
    .flatMap((entry) =>
      entry.pages.flatMap((page): PageNews[] => [
        ...(page.change === undefined
          ? []
          : [{ at: page.change.at, entry, kind: "page" as const, page, text: page.change.text }]),
        ...(page.revisedAt === undefined || page.revisedAt <= since
          ? []
          : [{ at: page.revisedAt, entry, kind: "page" as const, page }]),
      ]),
    )
    .toSorted((a, b) => b.at.localeCompare(a.at))
}

/**
 * Every change in the handbook and the FAQ, newest first – the pages' changes, and every
 * question changed since it was published, while a question only published is news for
 * a month and after that just a question.
 * @param chapters The handbook's chapters.
 * @param folders The FAQ's folders.
 * @param now The moment a month of news is counted to.
 * @returns The changes, newest first.
 */
export function changesOf(
  chapters: readonly ChapterEntry[],
  folders: readonly FaqFolder[],
  now: Date,
): readonly NewsItem[] {
  const since = freshSince(now)
  const questions = folders.flatMap((folder) =>
    folder.questions.flatMap((question): NewsItem[] => {
      const news = datedOf(question)
      return news === undefined || (news.kind === "new" && news.at <= since)
        ? []
        : [{ folder, kind: "question", news, question }]
    }),
  )
  return [...pageChangesOf(chapters, now), ...questions].toSorted((a, b) =>
    newsAt(b).localeCompare(newsAt(a)),
  )
}

/**
 * How long ago a change happened, as the list of changes groups it: within the last day,
 * week, or month, or before that.
 */
export type NewsAge = "day" | "month" | "older" | "week"

const dayMs = 24 * 60 * 60 * 1000

/**
 * The groups, newest first, each with how far back from now it reaches. A month is
 * thirty days, as long as a change is news.
 */
const ages: readonly { readonly age: NewsAge; readonly withinMs: number }[] = [
  { age: "day", withinMs: dayMs },
  { age: "week", withinMs: 7 * dayMs },
  { age: "month", withinMs: 30 * dayMs },
  { age: "older", withinMs: Infinity },
]

/**
 * Changes from one stretch of time.
 */
export interface NewsGroup {
  /**
   * How long ago they happened.
   */
  readonly age: NewsAge
  /**
   * The changes, in the order they came.
   */
  readonly items: readonly NewsItem[]
}

/**
 * Changes gathered by how long ago they happened.
 * @param items The changes, newest first.
 * @param now The moment the ages are counted from.
 * @returns The groups that hold anything, newest first.
 */
export function byAge(items: readonly NewsItem[], now: Date): readonly NewsGroup[] {
  return ages
    .map(({ age }, index) => ({
      age,
      items: items.filter((item) => ageIndex(item, now) === index),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * How many of the changes happened in the last week.
 * @param items The changes.
 * @param now The moment the week ends.
 * @returns The count.
 */
export function thisWeek(items: readonly NewsItem[], now: Date): number {
  const weekIndex = ages.findIndex(({ age }) => age === "week")
  return items.filter((item) => ageIndex(item, now) <= weekIndex).length
}

/**
 * Which group a change falls in.
 * @param item The change.
 * @param now The moment its age is counted from.
 * @returns The group's place among the ages.
 */
function ageIndex(item: NewsItem, now: Date): number {
  const age = now.getTime() - new Date(newsAt(item)).getTime()
  return ages.findIndex(({ withinMs }) => age <= withinMs)
}
