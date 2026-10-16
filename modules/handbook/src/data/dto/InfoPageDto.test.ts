import { describe, expect, it } from "vitest"

import { toHandbookPage, toHandbookPages } from "./InfoPageDto"

const chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }

const page = {
  _status: "published",
  changeNote: "Ny sida.",
  changeNoteAt: "2026-09-23T07:35:27.912Z",
  chapter,
  content: { root: { children: [], type: "root" } },
  id: 9,
  order: 0,
  position: 20_000,
  slug: "resan-till-wsj",
  title: "Resan till WSJ ",
}

describe("toHandbookPage", () => {
  it("reads a page with its chapter and its change note", () => {
    expect(toHandbookPage(page)).toEqual({
      change: { at: "2026-09-23T07:35:27.912Z", text: "Ny sida." },
      chapter: { id: 2, name: "Resa", order: 20, slug: "resa" },
      content: [],
      id: 9,
      position: 20_000,
      slug: "resan-till-wsj",
      title: "Resan till WSJ",
    })
  })

  it("leaves the change note out when either its text or its moment is missing", () => {
    expect(toHandbookPage({ ...page, changeNote: "" })?.change).toBeUndefined()
    expect(toHandbookPage({ ...page, changeNoteAt: undefined })?.change).toBeUndefined()
  })

  it("refuses a page whose chapter came as a bare id, and a draft", () => {
    expect(toHandbookPage({ ...page, chapter: 2 })).toBeUndefined()
    expect(toHandbookPage({ ...page, _status: "draft" })).toBeUndefined()
  })
})

describe("toHandbookPages", () => {
  it("drops a page it cannot read and keeps the rest", () => {
    const pages = toHandbookPages({ docs: [page, { id: "x" }], totalDocs: 2 })
    expect(pages.map((read) => read.id)).toEqual([9])
  })

  it("throws on an answer that is not a listing", () => {
    expect(() => toHandbookPages("<html>")).toThrow("not a list of pages")
  })
})
