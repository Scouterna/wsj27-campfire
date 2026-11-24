import { describe, expect, it } from "vitest"

import { changedPages, contentsOf, documentsOf } from "./documents"
import { chaptersOf, inReadingOrder, type Chapter, type HandbookPage } from "./Handbook"
import type { Block } from "./RichText"

const travel: Chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }
const appendix: Chapter = { id: 6, name: "Bilaga 1", order: 60, slug: "bilaga-1" }

/**
 * A heading of a rank, with nothing but its words.
 * @param rank The heading's rank on the page.
 * @param text Its words.
 * @returns The block.
 */
function heading(rank: 1 | 2, text: string): Block {
  return {
    children: [
      { isBold: false, isItalic: false, isStruck: false, isUnderlined: false, kind: "text", text },
    ],
    kind: "heading",
    rank,
  }
}

/**
 * A page in a chapter.
 * @param chapter Its chapter.
 * @param title The page's title, which its slug is made from.
 * @param position Where it sits in the handbook.
 * @param extra Its content and its changes, where it has them.
 * @returns The page.
 */
function page(
  chapter: Chapter,
  title: string,
  position: number,
  extra: Partial<Pick<HandbookPage, "change" | "content" | "revisedAt">> = {},
): HandbookPage {
  return {
    chapter,
    content: [],
    id: position,
    isPublic: true,
    position,
    slug: title.toLocaleLowerCase("sv-SE").replaceAll(" ", "-"),
    title,
    ...extra,
  }
}

const headings = [heading(1, "Hotell"), heading(2, "Frukost")]

const chapters = chaptersOf(
  inReadingOrder([
    page(travel, "Resa", 1),
    page(travel, "Boende", 2, {
      change: { at: "2026-11-01T00:00:00.000Z", text: "Nya adresser." },
      content: headings,
    }),
    page(appendix, "Bilaga 1", 3),
    page(appendix, "Schema", 4, {
      change: { at: "2026-11-05T00:00:00.000Z", text: "Nytt schema." },
    }),
  ]),
)

describe("documentsOf", () => {
  it("hands the handbook out without its appendices, and each appendix on its own", () => {
    expect(
      documentsOf(chapters).map((document) => [
        document.kind,
        document.title,
        document.fileName,
        document.chapters.map((entry) => entry.chapter.slug),
      ]),
    ).toEqual([
      ["handbook", "Handboken", "Handboken", ["resa"]],
      ["appendix", "Bilaga 1", "Bilaga-1", ["bilaga-1"]],
    ])
  })

  it("names an appendix's file by its letters and digits alone", () => {
    const named: Chapter = { ...appendix, name: "Bilaga 2: Packlista/utrustning " }
    const pages = [page(named, "Packlista", 1)]
    const [only] = documentsOf(chaptersOf(inReadingOrder(pages)))
    expect(only?.fileName).toBe("Bilaga-2-Packlista-utrustning")
  })

  it("leaves the handbook out when every chapter is an appendix", () => {
    const only = chapters.filter((entry) => entry.chapter.slug === "bilaga-1")
    expect(documentsOf(only).map((document) => document.kind)).toEqual(["appendix"])
  })
})

describe("contentsOf", () => {
  const [handbook, bilaga] = documentsOf(chapters)

  it("lists chapters, their pages, and each page's largest headings", () => {
    expect(handbook === undefined ? [] : contentsOf(handbook)).toEqual([
      { anchor: "chapter-resa", level: 1, title: "Resa" },
      { anchor: "page-boende", level: 2, title: "Boende" },
      { anchor: "page-boende-0", level: 3, title: "Hotell" },
    ])
  })

  it("starts an appendix's contents at its pages", () => {
    expect(bilaga === undefined ? [] : contentsOf(bilaga)).toEqual([
      { anchor: "page-schema", level: 2, title: "Schema" },
    ])
  })
})

describe("changedPages", () => {
  it("lists a document's own changes, newest first", () => {
    const now = new Date("2026-11-10T00:00:00.000Z")
    expect(
      documentsOf(chapters).map((document) =>
        changedPages(document, now).map((changed) => changed.page.title),
      ),
    ).toEqual([["Boende"], ["Schema"]])
  })

  it("lists a page published again without a note, as the change log does", () => {
    const now = new Date("2026-11-10T00:00:00.000Z")
    const [handbook] = documentsOf(
      chaptersOf([page(travel, "Resa", 1, { revisedAt: "2026-11-09T00:00:00.000Z" })]),
    )
    expect(
      handbook === undefined ? [] : changedPages(handbook, now).map((changed) => changed.text),
    ).toEqual([undefined])
  })
})
