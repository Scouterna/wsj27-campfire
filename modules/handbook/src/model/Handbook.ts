import type { Block } from "./RichText"

/**
 * A chapter of the handbook – what the contents list, and what a reader opens and reads
 * as one document.
 */
export interface Chapter {
  /**
   * The CMS's own id for it, which is what its editor is filtered by.
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
   * Where the page sits in the whole handbook, lowest first – across chapters, not only
   * within its own.
   */
  readonly position: number
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
   * Every change note in the chapter, newest first.
   */
  readonly changes: readonly ChangeNote[]
  /**
   * The chapter's place in the handbook, counted from 1 – what the contents number it by.
   */
  readonly number: number
  /**
   * The chapter's pages, in reading order.
   */
  readonly pages: readonly HandbookPage[]
}

/**
 * How long a change note counts as news to a reader this device has never seen open the
 * chapter – long enough to reach a leader who opens the handbook once a month.
 */
const freshForMs = 30 * 24 * 60 * 60 * 1000

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
    changes: group.pages
      .flatMap((page) => (page.change === undefined ? [] : [page.change]))
      .toSorted((a, b) => b.at.localeCompare(a.at)),
    number: index + 1,
    pages: group.pages,
  }))
}

/**
 * The change notes a reader has not seen: those written since this device last opened
 * the chapter, or – for a chapter it never opened – those still fresh.
 * @param entry The chapter.
 * @param lastRead When this device last opened the chapter, as an ISO 8601 instant, or
 * undefined when it never has.
 * @param now The moment to judge freshness against.
 * @returns The unseen notes, newest first.
 */
export function unseenChanges(
  entry: ChapterEntry,
  lastRead: string | undefined,
  now: Date,
): readonly ChangeNote[] {
  const since = lastRead ?? new Date(now.getTime() - freshForMs).toISOString()
  return entry.changes.filter((change) => change.at > since)
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
 * The chapters on either side of one, for reading the handbook straight through.
 * @param entries The chapters, in reading order.
 * @param chapterId The chapter to look either side of.
 * @returns The chapter before and the chapter after, each undefined at an end.
 */
export function neighborsOf(
  entries: readonly ChapterEntry[],
  chapterId: number,
): { readonly next: ChapterEntry | undefined; readonly previous: ChapterEntry | undefined } {
  const index = entries.findIndex((entry) => entry.chapter.id === chapterId)
  if (index === -1) {
    return { next: undefined, previous: undefined }
  }
  return { next: entries[index + 1], previous: entries[index - 1] }
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
