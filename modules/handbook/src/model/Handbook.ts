import type { Block } from "./RichText"

/**
 * A chapter of the handbook – what the contents list, and what a reader opens and reads
 * as one document.
 */
export interface Chapter {
  /**
   * The CMS's own id for it.
   */
  readonly id: number
  /**
   * What the chapter is called.
   */
  readonly name: string
  /**
   * Where the chapter sits among the others, lowest first.
   */
  readonly order: number
  /**
   * The chapter's address in the handbook, unique across it.
   */
  readonly slug: string
}

/**
 * What an editor said changed on a page, and when they said it.
 */
export interface ChangeNote {
  /**
   * When the note was written, as an ISO 8601 instant in UTC – a string rather than a
   * `Date`, because the cache persists the handbook as JSON, and so that two notes
   * compare in time order as plain strings.
   */
  readonly at: string
  /**
   * What changed, in the editor's words.
   */
  readonly text: string
}

/**
 * One page of the handbook, which the reader meets as a section of its chapter.
 */
export interface HandbookPage {
  /**
   * The latest change an editor called out, when there is one.
   */
  readonly change?: ChangeNote
  /**
   * The chapter the page belongs to.
   */
  readonly chapter: Chapter
  /**
   * The page's content, in reading order.
   */
  readonly content: readonly Block[]
  /**
   * The CMS's own id for it.
   */
  readonly id: number
  /**
   * Whether the handbook anyone may read carries the page too, rather than only the one
   * in Campfire.
   */
  readonly isPublic: boolean
  /**
   * Where the page sits in the whole handbook, lowest first – across chapters, not only
   * within its own.
   */
  readonly position: number
  /**
   * When the page was last published with no note to say what changed, as an ISO 8601
   * instant in UTC – a change that is dated but not described.
   */
  readonly revisedAt?: string
  /**
   * The page's anchor inside its chapter, unique across the handbook.
   */
  readonly slug: string
  /**
   * What the page is called.
   */
  readonly title: string
}

/**
 * A chapter as the reader meets it: its place in the handbook, its pages, and what
 * changed in it.
 */
export interface ChapterEntry {
  /**
   * The chapter.
   */
  readonly chapter: Chapter
  /**
   * When the chapter's pages changed, noted or not, newest first, as ISO 8601 instants in
   * UTC.
   */
  readonly changes: readonly string[]
  /**
   * The chapter's place in the handbook, counted from 1 – what the contents number it by.
   */
  readonly number: number
  /**
   * The chapter's pages, in reading order.
   */
  readonly pages: readonly HandbookPage[]
}

const dayMs = 24 * 60 * 60 * 1000

/**
 * How long a change counts as news – long enough to reach a leader who opens the
 * handbook once a month. Every reader sees the same news, whatever they have opened.
 */
const freshForMs = 30 * dayMs

/**
 * The moment after which a change is news.
 * @param now The moment to judge freshness against.
 * @returns The moment, as an ISO 8601 instant in UTC.
 */
export function freshSince(now: Date): string {
  return new Date(now.getTime() - freshForMs).toISOString()
}

/**
 * How news a change still is, by its age: within a week, two weeks, or a month, or older
 * than that, when it is no longer news but still dated.
 */
export type Freshness = "fading" | "fresh" | "recent" | "settled"

/**
 * How news a change is.
 * @param at When it happened, as an ISO 8601 instant.
 * @param now The moment to judge freshness against.
 * @returns The change's freshness.
 */
export function freshnessOf(at: string, now: Date): Freshness {
  const age = now.getTime() - new Date(at).getTime()
  if (age <= 7 * dayMs) {
    return "fresh"
  }
  if (age <= 14 * dayMs) {
    return "recent"
  }
  return age <= freshForMs ? "fading" : "settled"
}

/**
 * The pages in the order the handbook is read: by chapter, then by the page's place.
 * @param pages The pages, in any order.
 * @returns A new array in reading order.
 */
export function inReadingOrder(pages: readonly HandbookPage[]): readonly HandbookPage[] {
  return pages.toSorted(
    (a, b) =>
      a.chapter.order - b.chapter.order || a.chapter.id - b.chapter.id || a.position - b.position,
  )
}

/**
 * The chapters, each with its pages and its change notes, numbered in reading order. A
 * chapter nobody has written a page for yet is left out, because there is nothing in it
 * to read.
 * @param pages The pages, in reading order.
 * @returns The chapters.
 */
export function chaptersOf(pages: readonly HandbookPage[]): readonly ChapterEntry[] {
  const groups: { chapter: Chapter; pages: HandbookPage[] }[] = []
  for (const page of pages) {
    const last = groups.at(-1)
    if (last?.chapter.id === page.chapter.id) {
      last.pages.push(page)
    } else {
      groups.push({ chapter: page.chapter, pages: [page] })
    }
  }
  return groups.map((group, index) => ({
    chapter: group.chapter,
    changes: group.pages.flatMap((page) => changesOn(page)).toSorted((a, b) => b.localeCompare(a)),
    number: index + 1,
    pages: group.pages,
  }))
}

/**
 * When a page changed: when its note was written, and when it was published again with
 * no note.
 * @param page The page.
 * @returns The moments, as ISO 8601 instants in UTC, in no particular order.
 */
export function changesOn(page: HandbookPage): readonly string[] {
  return [
    ...(page.change === undefined ? [] : [page.change.at]),
    ...(page.revisedAt === undefined ? [] : [page.revisedAt]),
  ]
}

/**
 * When a page last changed, noted or not.
 * @param page The page.
 * @returns The moment, as an ISO 8601 instant in UTC, or undefined for a page unchanged
 * since it was written.
 */
export function lastChangeOn(page: HandbookPage): string | undefined {
  return changesOn(page).toSorted((a, b) => b.localeCompare(a))[0]
}

/**
 * When anything in the chapters last changed, noted or not.
 * @param chapters The chapters.
 * @returns The moment, as an ISO 8601 instant in UTC, or undefined when nothing changed
 * since it was written.
 */
export function lastChangeIn(chapters: readonly ChapterEntry[]): string | undefined {
  return chapters.flatMap((entry) => entry.changes).toSorted((a, b) => b.localeCompare(a))[0]
}

/**
 * When the chapter's pages changed, as long as the changes are still news.
 * @param entry The chapter.
 * @param now The moment to judge freshness against.
 * @returns The moments, newest first.
 */
export function freshChanges(entry: ChapterEntry, now: Date): readonly string[] {
  const since = freshSince(now)
  return entry.changes.filter((at) => at > since)
}

/**
 * The chapter an address names, and the page inside it when the address named a page,
 * so a link to a single page lands on its section.
 * @param entries The chapters.
 * @param slug The chapter's or a page's slug.
 * @returns The chapter, with the page to scroll to when the slug was a page's, or
 * undefined when nothing holds the slug.
 */
export function chapterAt(
  entries: readonly ChapterEntry[],
  slug: string,
): { readonly entry: ChapterEntry; readonly page?: HandbookPage } | undefined {
  const entry = entries.find((candidate) => candidate.chapter.slug === slug)
  if (entry !== undefined) {
    return { entry }
  }
  for (const candidate of entries) {
    const page = candidate.pages.find((inner) => inner.slug === slug)
    if (page !== undefined) {
      return { entry: candidate, page }
    }
  }
  return undefined
}

/**
 * A chapter's number as the contents print it – two digits, the way a table of contents
 * lines up.
 * @param number The chapter's place, counted from 1.
 * @returns The number, such as "03".
 */
export function chapterNumber(number: number): string {
  return String(number).padStart(2, "0")
}

/**
 * Whether a page only repeats its chapter's name, which makes it the chapter's
 * introduction – read under the chapter's own title rather than under one of its own.
 * @param page The page.
 * @param entry Its chapter.
 * @returns True for the introduction.
 */
export function isIntroduction(page: HandbookPage, entry: ChapterEntry): boolean {
  return page.title.toLocaleLowerCase("sv-SE") === entry.chapter.name.toLocaleLowerCase("sv-SE")
}
