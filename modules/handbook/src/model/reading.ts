import type { FaqFolder } from "./Faq"
import type { ChapterEntry } from "./Handbook"

/**
 * A screen of the handbook read straight through: a chapter, or a folder of the FAQ.
 */
export type ReadingStop =
  | { readonly entry: ChapterEntry; readonly kind: "chapter" }
  | { readonly folder: FaqFolder; readonly kind: "folder" }

/**
 * The handbook in the order it is read straight through – every chapter, then every
 * folder of the FAQ, as the outline lists them.
 * @param chapters The chapters, in reading order.
 * @param folders The FAQ's folders, in reading order.
 * @returns The stops.
 */
export function readingOrder(
  chapters: readonly ChapterEntry[],
  folders: readonly FaqFolder[],
): readonly ReadingStop[] {
  return [
    ...chapters.map((entry): ReadingStop => ({ entry, kind: "chapter" })),
    ...folders.map((folder): ReadingStop => ({ folder, kind: "folder" })),
  ]
}

/**
 * What tells a stop from every other, across chapters and folders alike – a chapter's
 * slug cannot be mistaken for a folder's id, because the folder's is prefixed.
 * @param stop The stop.
 * @returns The key.
 */
export function stopKey(stop: ReadingStop): string {
  return stop.kind === "chapter" ? stop.entry.chapter.slug : `faq-${String(stop.folder.id)}`
}

/**
 * The stops either side of one, for reading the handbook straight through – from the
 * last chapter on into the FAQ, and from its first folder back.
 * @param stops The stops, in reading order.
 * @param key The key of the stop to look either side of.
 * @returns The stop before and the stop after, each undefined at an end.
 */
export function besideStop(
  stops: readonly ReadingStop[],
  key: string,
): { readonly next: ReadingStop | undefined; readonly previous: ReadingStop | undefined } {
  const index = stops.findIndex((stop) => stopKey(stop) === key)
  if (index === -1) {
    return { next: undefined, previous: undefined }
  }
  return { next: stops[index + 1], previous: stops[index - 1] }
}
