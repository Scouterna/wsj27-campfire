import { describe, expect, it } from "vitest"

import type { FaqFolder } from "./Faq"
import { chaptersOf, type Chapter, type HandbookPage } from "./Handbook"
import { besideStop, readingOrder, stopKey } from "./reading"

/**
 * A page that is all its chapter holds.
 * @param chapter The chapter.
 * @returns The page.
 */
function onlyPage(chapter: Chapter): HandbookPage {
  return {
    chapter,
    content: [],
    id: chapter.id,
    isPublic: true,
    position: chapter.order,
    slug: `${chapter.slug}-sida`,
    title: chapter.name,
  }
}

const chapters = chaptersOf([
  onlyPage({ id: 1, name: "Välkommen", order: 0, slug: "valkommen" }),
  onlyPage({ id: 2, name: "Resa", order: 10, slug: "resa" }),
])

/**
 * An empty folder of the FAQ.
 * @param id The folder's id.
 * @returns The folder.
 */
function folder(id: number): FaqFolder {
  return { id, name: `Mapp ${String(id)}`, position: id, questions: [] }
}

const stops = readingOrder(chapters, [folder(7), folder(8)])

describe("readingOrder", () => {
  it("reads every chapter, then every folder of the FAQ", () => {
    expect(stops.map((stop) => stopKey(stop))).toEqual(["valkommen", "resa", "faq-7", "faq-8"])
  })
})

describe("besideStop", () => {
  it("goes on from the last chapter into the FAQ, and back from its first folder", () => {
    expect(besideStop(stops, "resa").next).toEqual({ folder: folder(7), kind: "folder" })
    expect(besideStop(stops, "faq-7").previous?.kind).toBe("chapter")
  })

  it("finds nothing past the ends, nor beside a stop that is not there", () => {
    expect(besideStop(stops, "valkommen").previous).toBeUndefined()
    expect(besideStop(stops, "faq-8").next).toBeUndefined()
    expect(besideStop(stops, "saknas")).toEqual({ next: undefined, previous: undefined })
  })
})
