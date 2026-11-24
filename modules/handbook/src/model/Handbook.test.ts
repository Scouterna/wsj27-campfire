import { describe, expect, it } from "vitest"

import {
  chapterAt,
  chapterNumber,
  chaptersOf,
  freshChanges,
  freshnessOf,
  inReadingOrder,
  lastChangeIn,
  lastChangeOn,
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
    isPublic: true,
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
const second = chapters[1]

describe("chaptersOf", () => {
  it("groups the pages under their chapters, numbered in reading order", () => {
    expect(
      chapters.map((entry) => [entry.number, entry.chapter.name, entry.pages.map((p) => p.slug)]),
    ).toEqual([
      [1, "Välkommen", ["om", "kontakt"]],
      [2, "Resa", ["resan", "adresser"]],
    ])
  })

  it("gathers when a chapter's pages changed, noted or not, newest first", () => {
    const revised = chaptersOf([
      { ...page("resan", travel, 20_000, "2026-09-23T07:35:30.000Z") },
      { ...page("adresser", travel, 20_080), revisedAt: "2026-09-25T10:00:00.000Z" },
    ])
    expect(revised[0]?.changes).toEqual(["2026-09-25T10:00:00.000Z", "2026-09-23T07:35:30.000Z"])
  })
})

describe("lastChangeIn", () => {
  it("dates the chapters by the newest change in any of them, noted or not", () => {
    const revised = chaptersOf([
      page("om", welcome, 0, "2026-09-01T00:00:00.000Z"),
      { ...page("resan", travel, 20_000), revisedAt: "2026-09-25T10:00:00.000Z" },
    ])
    expect(lastChangeIn(revised)).toBe("2026-09-25T10:00:00.000Z")
    const unchanged = chaptersOf([page("om", welcome, 0)])
    expect(lastChangeIn(unchanged)).toBeUndefined()
  })
})

describe("lastChangeOn", () => {
  it("dates a page by its note or by a later publishing without one", () => {
    const noted = page("resan", travel, 20_000, "2026-09-23T07:35:30.000Z")
    expect(lastChangeOn(noted)).toBe("2026-09-23T07:35:30.000Z")
    expect(lastChangeOn({ ...noted, revisedAt: "2026-11-24T10:32:26.230Z" })).toBe(
      "2026-11-24T10:32:26.230Z",
    )
    expect(lastChangeOn(page("om", welcome, 0))).toBeUndefined()
  })
})

describe("freshChanges", () => {
  it("keeps only the changes of the last month, whoever reads them", () => {
    const now = new Date("2026-09-29T12:00:00.000Z")
    expect(second && freshChanges(second, now)).toEqual(["2026-09-23T07:35:30.000Z"])
  })
})

describe("freshnessOf", () => {
  const now = new Date("2026-09-29T12:00:00.000Z")

  it("fades a change week by week, and keeps it dated once it is no longer news", () => {
    expect(freshnessOf("2026-09-23T12:00:00.000Z", now)).toBe("fresh")
    expect(freshnessOf("2026-09-17T12:00:00.000Z", now)).toBe("recent")
    expect(freshnessOf("2026-09-05T12:00:00.000Z", now)).toBe("fading")
    expect(freshnessOf("2026-08-01T12:00:00.000Z", now)).toBe("settled")
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

describe("chapterNumber", () => {
  it("pads to two digits", () => {
    expect(chapterNumber(3)).toBe("03")
    expect(chapterNumber(12)).toBe("12")
  })
})
