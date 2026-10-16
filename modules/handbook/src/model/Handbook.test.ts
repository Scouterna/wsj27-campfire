import { describe, expect, it } from "vitest"

import {
  chapterAt,
  chapterNumber,
  chaptersOf,
  inReadingOrder,
  neighborsOf,
  unseenChanges,
  type Chapter,
  type HandbookPage,
} from "./Handbook"

const welcome: Chapter = { id: 1, name: "Välkommen", order: 0, slug: "valkommen" }
const travel: Chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }

/**
 * A page with nothing on it but where it sits.
 * @param slug The page's slug, which is also its title.
 * @param chapter The chapter it belongs to.
 * @param position Where it sits in the handbook.
 * @param changedAt When its change note was written, for a page that has one.
 * @returns The page.
 */
function page(slug: string, chapter: Chapter, position: number, changedAt?: string): HandbookPage {
  return {
    chapter,
    content: [],
    id: position,
    position,
    slug,
    title: slug,
    ...(changedAt !== undefined && { change: { at: changedAt, text: `Nytt på ${slug}` } }),
  }
}

const pages = inReadingOrder([
  page("resan", travel, 20_000, "2026-09-23T07:35:30.000Z"),
  page("adresser", travel, 20_080, "2026-08-01T00:00:00.000Z"),
  page("kontakt", welcome, 20, "2026-09-23T07:35:27.000Z"),
  page("om", welcome, 0),
])
const chapters = chaptersOf(pages)
const [first, second] = chapters

describe("chaptersOf", () => {
  it("groups the pages under their chapters, numbered in reading order", () => {
    expect(
      chapters.map((entry) => [entry.number, entry.chapter.name, entry.pages.map((p) => p.slug)]),
    ).toEqual([
      [1, "Välkommen", ["om", "kontakt"]],
      [2, "Resa", ["resan", "adresser"]],
    ])
  })

  it("gathers a chapter's change notes, newest first", () => {
    expect(second?.changes.map((change) => change.text)).toEqual([
      "Nytt på resan",
      "Nytt på adresser",
    ])
  })
})

describe("unseenChanges", () => {
  const now = new Date("2026-09-29T12:00:00.000Z")

  it("counts only the fresh notes for a chapter never opened here", () => {
    expect(second && unseenChanges(second, undefined, now).map((change) => change.text)).toEqual([
      "Nytt på resan",
    ])
  })

  it("counts the notes written since the chapter was last opened", () => {
    expect(second && unseenChanges(second, "2026-07-01T00:00:00.000Z", now)).toHaveLength(2)
    expect(second && unseenChanges(second, "2026-09-24T00:00:00.000Z", now)).toHaveLength(0)
  })
})

describe("chapterAt", () => {
  it("finds a chapter by its own slug", () => {
    expect(chapterAt(chapters, "resa")?.entry.chapter.id).toBe(2)
    expect(chapterAt(chapters, "resa")?.page).toBeUndefined()
  })

  it("finds the chapter a page's slug belongs to, and the page", () => {
    const found = chapterAt(chapters, "kontakt")
    expect([found?.entry.chapter.slug, found?.page?.slug]).toEqual(["valkommen", "kontakt"])
  })

  it("finds nothing for a slug nobody holds", () => {
    expect(chapterAt(chapters, "saknas")).toBeUndefined()
  })
})

describe("neighborsOf", () => {
  it("finds the chapters either side, and nothing past the ends", () => {
    expect(neighborsOf(chapters, 1).next).toBe(second)
    expect(neighborsOf(chapters, 1).previous).toBeUndefined()
    expect(neighborsOf(chapters, 2).previous).toBe(first)
    expect(neighborsOf(chapters, 2).next).toBeUndefined()
  })
})

describe("chapterNumber", () => {
  it("pads to two digits", () => {
    expect(chapterNumber(3)).toBe("03")
    expect(chapterNumber(12)).toBe("12")
  })
})
