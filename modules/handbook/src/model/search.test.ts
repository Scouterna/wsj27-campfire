import { describe, expect, it } from "vitest"

import { chaptersOf, type Chapter, type HandbookPage } from "./Handbook"
import type { Inline } from "./RichText"
import { searchHandbook } from "./search"

const travel: Chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }

/**
 * Plain text as one run.
 * @param text The text.
 * @returns The run.
 */
function run(text: string): Inline {
  return {
    isBold: false,
    isItalic: false,
    isStruck: false,
    isUnderlined: false,
    kind: "text",
    text,
  }
}

const page: HandbookPage = {
  chapter: travel,
  content: [
    { children: [run("Pass krävs för alla, även på Färjan.")], kind: "paragraph" },
    {
      isOrdered: false,
      items: [{ children: [run("Ta med matsäck till färjan")], nested: [] }],
      kind: "list",
    },
    { children: [run("Ingenting här.")], kind: "paragraph" },
  ],
  id: 1,
  position: 0,
  slug: "resan",
  title: "Resan",
}

describe("searchHandbook", () => {
  const chapters = chaptersOf([page])

  it("finds every passage holding the text, whatever its case", () => {
    const result = searchHandbook(chapters, "färjan")
    expect(result.chapterCount).toBe(1)
    expect(result.hits.map((hit) => [hit.before, hit.match, hit.after])).toEqual([
      ["Pass krävs för alla, även på ", "Färjan", "."],
      ["Ta med matsäck till ", "färjan", ""],
    ])
  })

  it("keeps å, ä, and ö apart from a, a, and o", () => {
    expect(searchHandbook(chapters, "farjan").hits).toHaveLength(0)
  })

  it("cuts a long passage down to the words around the match", () => {
    const long = {
      ...page,
      content: [
        {
          children: [run(`${"ord ".repeat(30)}färjan${" ord".repeat(40)}`)],
          kind: "paragraph" as const,
        },
      ],
    }
    const [hit] = searchHandbook(chaptersOf([long]), "färjan").hits
    expect(hit?.before.startsWith("…")).toBe(true)
    expect(hit?.after.endsWith("…")).toBe(true)
  })

  it("finds nothing for an empty text", () => {
    expect(searchHandbook(chapters, "").hits).toHaveLength(0)
  })
})
