import type { FaqFolder, FaqQuestion } from "./Faq"
import { passagesOf } from "./RichText"

/**
 * One place the search text was found: the folder and question it is in, and the passage
 * around it, cut to a quote.
 */
export interface SearchHit {
  /**
   * The quoted text after the match.
   */
  readonly after: string
  /**
   * The quoted text before the match.
   */
  readonly before: string
  /**
   * The folder the passage is in.
   */
  readonly folder: FaqFolder
  /**
   * The match itself, as the FAQ spells it.
   */
  readonly match: string
  /**
   * The question the passage is in, which the hit leads to.
   */
  readonly question: FaqQuestion
}

// How much of a passage a quote keeps on either side of the match. More after than
// before, because the words after a match say what it is about.
const keepBefore = 40
const keepAfter = 80

// A common word matches half the FAQ, and a list that long is read by nobody.
const maxHits = 50

/**
 * The FAQ searched for a text, ignoring case – the questions and their answers alike.
 * @param folders The folders, in reading order.
 * @param query The text to find, already trimmed.
 * @returns The hits, in reading order and at most one per passage – none for an empty
 * query.
 */
export function searchFaq(folders: readonly FaqFolder[], query: string): readonly SearchHit[] {
  const needle = fold(query)
  if (needle === "") {
    return []
  }
  const hits: SearchHit[] = []
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
  return hits.slice(0, maxHits)
}

/**
 * Text folded for comparing, in Swedish, so "Ä" finds "ä" but never "a".
 * @param text The text.
 * @returns The folded text.
 */
function fold(text: string): string {
  return text.toLocaleLowerCase("sv-SE")
}

/**
 * The quote around the first match in a passage.
 * @param passage The passage.
 * @param needle The folded search text.
 * @returns The quote in three parts, or undefined when the passage does not match.
 */
function quote(
  passage: string,
  needle: string,
): Pick<SearchHit, "after" | "before" | "match"> | undefined {
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
