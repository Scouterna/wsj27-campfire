import { describe, expect, it } from "vitest"

import type { FaqFolder } from "./Faq"
import { chaptersOf, inReadingOrder, type Chapter, type HandbookPage } from "./Handbook"
import { byAge, changesOf, thisWeek, type NewsItem } from "./news"

const travel: Chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }

/**
 * A page with nothing on it but its change note, when it has one.
 * @param slug The page's slug, which is also its title.
 * @param position Where it sits in the handbook.
 * @param changedAt When its change note was written, for a page that has one.
 * @returns The page.
 */
function page(slug: string, position: number, changedAt?: string): HandbookPage {
  return {
    chapter: travel,
    content: [],
    id: position,
    isPublic: true,
    position,
    slug,
    title: slug,
    ...(changedAt !== undefined && { change: { at: changedAt, text: `Nytt på ${slug}` } }),
  }
}

const chapters = chaptersOf(
  inReadingOrder([
    page("resan", 1, "2026-11-08T00:00:00.000Z"),
    page("adresser", 2, "2026-10-20T00:00:00.000Z"),
    page("packning", 3),
  ]),
)

const folders: readonly FaqFolder[] = [
  {
    id: 7,
    name: "Hälsa",
    position: 1,
    questions: [
      {
        answer: [],
        changedAt: "2026-11-09T12:00:00.000Z",
        createdAt: "2026-11-09T12:00:00.000Z",
        id: 71,
        title: "Ny fråga",
      },
      {
        answer: [],
        changedAt: "2026-11-05T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
        id: 72,
        title: "Ändrad fråga",
      },
      {
        answer: [],
        changedAt: "2025-01-01T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
        id: 73,
        title: "Gammal fråga",
      },
    ],
  },
]

/**
 * What a list holds, by a page's slug or a question's title and its kind of news.
 * @param items The list.
 * @returns One line per item.
 */
function said(items: readonly NewsItem[]): readonly string[] {
  return items.map((item) =>
    item.kind === "page" ? item.page.slug : `${item.question.title} (${item.news.kind})`,
  )
}

describe("changesOf", () => {
  const now = new Date("2026-11-10T00:00:00.000Z")

  it("lists every noted page and every changed question, however old, newest first", () => {
    const old = chaptersOf(
      inReadingOrder([
        page("resan", 1, "2026-11-08T00:00:00.000Z"),
        page("visum", 2, "2025-03-01T00:00:00.000Z"),
      ]),
    )
    expect(said(changesOf(old, folders, now))).toEqual([
      "Ny fråga (new)",
      "resan",
      "Ändrad fråga (changed)",
      "visum",
    ])
  })

  it("leaves out a question only published, once it is no longer news", () => {
    expect(said(changesOf([], folders, now))).not.toContain("Gammal fråga (new)")
    const later = new Date("2026-12-20T00:00:00.000Z")
    expect(said(changesOf([], folders, later))).toEqual(["Ändrad fråga (changed)"])
  })
})

describe("byAge", () => {
  const now = new Date("2026-11-10T00:00:00.000Z")

  it("groups the changes by the last day, week, and month, and before, leaving out empty groups", () => {
    const aged = chaptersOf(
      inReadingOrder([
        page("idag", 1, "2026-11-09T12:00:00.000Z"),
        page("manad", 2, "2026-10-20T00:00:00.000Z"),
        page("aldre", 3, "2026-09-01T00:00:00.000Z"),
      ]),
    )
    const groups = byAge(changesOf(aged, [], now), now)
    expect(groups.map((group) => [group.age, said(group.items)])).toEqual([
      ["day", ["idag"]],
      ["month", ["manad"]],
      ["older", ["aldre"]],
    ])
  })
})

describe("thisWeek", () => {
  it("counts the changes of the last week", () => {
    const now = new Date("2026-11-10T00:00:00.000Z")
    expect(thisWeek(changesOf(chapters, folders, now), now)).toBe(3)
  })
})
