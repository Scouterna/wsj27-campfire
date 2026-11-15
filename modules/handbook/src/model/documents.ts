import { isIntroduction, type ChapterEntry, type HandbookPage } from "./Handbook"
import { plainText } from "./RichText"

/**
 * One document the handbook is handed out as: the handbook itself, or one of its
 * appendices, which is long enough, and used apart from the rest often enough, to be a
 * document of its own.
 */
export interface HandbookDocument {
  /**
   * The chapters the document holds – every chapter that is not an appendix, or the one
   * that is.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * What the document's file is called, without its extension.
   */
  readonly fileName: string
  readonly kind: "appendix" | "handbook"
  /**
   * What the document's cover says it is.
   */
  readonly title: string
}

/**
 * Whether a chapter is an appendix. The CMS gives a chapter nothing but its name, so the
 * name is what says so.
 * @param entry The chapter.
 * @returns True for a chapter the editors named as an appendix.
 */
export function isAppendix(entry: ChapterEntry): boolean {
  return entry.chapter.name.toLocaleLowerCase("sv-SE").startsWith("bilaga")
}

/**
 * The documents the handbook is handed out as: the handbook without its appendices
 * first, then each appendix on its own.
 * @param chapters Every chapter, in reading order.
 * @returns The documents, the handbook left out when every chapter is an appendix.
 */
export function documentsOf(chapters: readonly ChapterEntry[]): readonly HandbookDocument[] {
  const body = chapters.filter((entry) => !isAppendix(entry))
  const appendices = chapters.filter((entry) => isAppendix(entry))
  return [
    ...(body.length === 0
      ? []
      : [{ chapters: body, fileName: "Handboken", kind: "handbook", title: "Handboken" } as const]),
    ...appendices.map((entry): HandbookDocument => ({
      chapters: [entry],
      // Only what every file system takes in a name, the chapter's letters kept.
      fileName: entry.chapter.name.replaceAll(/[^\p{L}\p{N}]+/gu, "-").replaceAll(/^-|-$/gu, ""),
      kind: "appendix",
      title: entry.chapter.name,
    })),
  ]
}

/**
 * One line of a document's table of contents.
 */
export interface ContentsLine {
  /**
   * The place in the document the line leads to.
   */
  readonly anchor: string
  /**
   * How deep the line sits: a chapter, a page in it, or a heading on the page.
   */
  readonly level: 1 | 2 | 3
  readonly title: string
}

/**
 * The place in a document a chapter starts at.
 * @param entry The chapter.
 * @returns The anchor.
 */
export function chapterAnchor(entry: ChapterEntry): string {
  return `chapter-${entry.chapter.slug}`
}

/**
 * The place in a document a page starts at.
 * @param page The page.
 * @returns The anchor.
 */
export function pageAnchor(page: HandbookPage): string {
  return `page-${page.slug}`
}

/**
 * The place in a document one of a page's blocks sits at.
 * @param page The page.
 * @param index The block's place in the page's content.
 * @returns The anchor.
 */
export function blockAnchor(page: HandbookPage, index: number): string {
  return `${pageAnchor(page)}-${String(index)}`
}

/**
 * A document's table of contents: each chapter, the pages in it, and the largest headings
 * on each page. An appendix is a single chapter, which its cover already names, so its
 * contents start at its pages.
 * @param document The document.
 * @returns The lines, in reading order.
 */
export function contentsOf(document: HandbookDocument): readonly ContentsLine[] {
  return document.chapters.flatMap((entry) => [
    ...(document.kind === "handbook"
      ? [{ anchor: chapterAnchor(entry), level: 1, title: entry.chapter.name } as const]
      : []),
    ...entry.pages.flatMap((page) => [
      ...(isIntroduction(page, entry)
        ? []
        : [{ anchor: pageAnchor(page), level: 2, title: page.title } as const]),
      ...page.content.flatMap((block, index): ContentsLine[] =>
        block.kind === "heading" && block.rank === 1
          ? [{ anchor: blockAnchor(page, index), level: 3, title: plainText(block.children) }]
          : [],
      ),
    ]),
  ])
}

/**
 * The pages of a document an editor has noted a change on, newest first.
 * @param document The document.
 * @returns The pages, each with a note.
 */
export function changedPages(
  document: HandbookDocument,
): readonly (HandbookPage & { readonly change: NonNullable<HandbookPage["change"]> })[] {
  return document.chapters
    .flatMap((entry) => entry.pages)
    .flatMap((page) => (page.change === undefined ? [] : [{ ...page, change: page.change }]))
    .toSorted((a, b) => b.change.at.localeCompare(a.change.at))
}
