import type { FaqFolder, FaqQuestion } from "./Faq"
import type { ChapterEntry, HandbookPage } from "./Handbook"
import { passagesOf } from "./RichText"

/**
 * A passage the search text was found in, cut to a quote around the match.
 */
export interface Quote {
  /**
   * The quoted text after the match.
   */
  readonly after: string
  /**
   * The quoted text before the match.
   */
  readonly before: string
  /**
   * The match itself, as the source spells it.
   */
  readonly match: string
}

/**
 * One place in the handbook the search text was found: the chapter and page it is in,
 * and the passage around it.
 */
export interface HandbookHit extends Quote {
  /**
   * The chapter the passage is in.
   */
  readonly entry: ChapterEntry
  /**
   * The page the passage is in, which the hit leads to.
   */
  readonly page: HandbookPage
}

/**
 * One place in the FAQ the search text was found: the folder and question it is in, and
 * the passage around it.
 */
export interface FaqHit extends Quote {
  /**
   * The folder the passage is in.
   */
  readonly folder: FaqFolder
  /**
   * The question the passage is in, which the hit leads to.
   */
  readonly question: FaqQuestion
}

/**
 * What a search of the handbook found.
 */
export interface HandbookResult {
  /**
   * How many chapters the hits are in.
   */
  readonly chapterCount: number
  /**
   * The hits, in reading order, at most one per passage.
   */
  readonly hits: readonly HandbookHit[]
}

// How much of a passage a quote keeps on either side of the match. More after than
// before, because the words after a match say what it is about.
const keepBefore = 40
const keepAfter = 80

/**
 * The handbook searched for a text, ignoring case – the pages' titles and their content
 * alike.
 * @param entries The chapters, in reading order.
 * @param query The text to find, already trimmed.
 * @returns Every hit, and how many chapters they are in – none for an empty query.
 */
export function searchHandbook(entries: readonly ChapterEntry[], query: string): HandbookResult {
  const needle = fold(query)
  if (needle === "") {
    return { chapterCount: 0, hits: [] }
  }
  const hits: HandbookHit[] = []
  for (const entry of entries) {
    for (const page of entry.pages) {
      for (const passage of [page.title, ...passagesOf(page.content)]) {
        const hit = quote(passage, needle)
        if (hit !== undefined) {
          hits.push({ ...hit, entry, page })
        }
      }
    }
  }
  return {
    chapterCount: new Set(hits.map((hit) => hit.entry.chapter.id)).size,
    hits,
  }
}

/**
 * The FAQ searched for a text, ignoring case – the questions and their answers alike.
 * @param folders The folders, in reading order.
 * @param query The text to find, already trimmed.
 * @returns Every hit, in reading order and at most one per passage – none for an empty
 * query.
 */
export function searchFaq(folders: readonly FaqFolder[], query: string): readonly FaqHit[] {
  const needle = fold(query)
  if (needle === "") {
    return []
  }
  const hits: FaqHit[] = []
  for (const folder of folders) {
    for (const question of folder.questions) {
      for (const passage of [question.title, ...passagesOf(question.answer)]) {
        const hit = quote(passage, needle)
        if (hit !== undefined) {
          hits.push({ ...hit, folder, question })
        }
      }
    }
  }
  return hits
}

/**
 * A place the search found the text in – a page or a question – by its first hit, and
 * how many more hits the same place holds.
 */
export interface PlaceHits<T> {
  /**
   * The place's first hit, in reading order, which stands for it.
   */
  readonly first: T
  /**
   * How many more hits the place holds after the first.
   */
  readonly more: number
}

/**
 * Hits gathered by the place they are in, so a word a page repeats lists the page once
 * rather than once per passage. A common word matches dozens of passages in one page,
 * and a list that long is read by nobody.
 * @param hits The hits, in reading order.
 * @param placeOf The id of the place a hit is in.
 * @returns One entry per place, in the order the places were first hit.
 */
export function byPlace<T>(
  hits: readonly T[],
  placeOf: (hit: T) => number,
): readonly PlaceHits<T>[] {
  const places = new Map<number, { first: T; more: number }>()
  for (const hit of hits) {
    const place = places.get(placeOf(hit))
    if (place === undefined) {
      places.set(placeOf(hit), { first: hit, more: 0 })
    } else {
      place.more += 1
    }
  }
  return places.values().toArray()
}

/**
 * Text folded for comparing, in Swedish, so "Ä" finds "ä" but never "a".
 * @param text The text.
 * @returns The folded text.
 */
function fold(text: string): string {
  // A non-breaking space is a space to whoever searches, and swapping one for the other
  // keeps every letter where it was, which the quoting counts on.
  return text.replaceAll("\u{A0}", " ").toLocaleLowerCase("sv-SE")
}

/**
 * The quote around the first match in a passage.
 * @param passage The passage.
 * @param needle The folded search text.
 * @returns The quote in three parts, or undefined when the passage does not match.
 */
function quote(passage: string, needle: string): Quote | undefined {
  const folded = fold(passage)
  const index = folded.indexOf(needle)
  // Folding keeps the length of every Swedish letter, so an index into the folded text
  // is an index into the passage. A passage where it did not is skipped rather than
  // quoted wrong.
  if (index === -1 || folded.length !== passage.length) {
    return undefined
  }
  const end = index + needle.length
  return {
    after: trimAfter(passage.slice(end)),
    before: trimBefore(passage.slice(0, index)),
    match: passage.slice(index, end),
  }
}

/**
 * The end of the text before a match, cut at a word and marked where it was cut.
 * @param text The text before the match.
 * @returns What the quote keeps.
 */
function trimBefore(text: string): string {
  if (text.length <= keepBefore) {
    return text
  }
  const cut = text.slice(-keepBefore)
  const space = cut.indexOf(" ")
  return `…${space === -1 ? cut : cut.slice(space + 1)}`
}

/**
 * The start of the text after a match, cut at a word and marked where it was cut.
 * @param text The text after the match.
 * @returns What the quote keeps.
 */
function trimAfter(text: string): string {
  if (text.length <= keepAfter) {
    return text
  }
  const cut = text.slice(0, keepAfter)
  const space = cut.lastIndexOf(" ")
  return `${space === -1 ? cut : cut.slice(0, space)}…`
}
