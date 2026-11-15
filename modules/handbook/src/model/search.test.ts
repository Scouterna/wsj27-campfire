import { describe, expect, it } from "vitest"

import type { FaqFolder } from "./Faq"
import { chaptersOf, type Chapter, type HandbookPage } from "./Handbook"
import type { Inline } from "./RichText"
import { byPlace, searchFaq, searchHandbook } from "./search"

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
  isPublic: true,
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

  it("reads a non-breaking space as a space", () => {
    const dated: HandbookPage = {
      ...page,
      content: [{ children: [run("Vi reser 30\u{A0}juli.")], kind: "paragraph" }],
    }
    expect(searchHandbook(chaptersOf([dated]), "30 juli").hits).toHaveLength(1)
  })

  it("finds nothing for an empty text", () => {
    expect(searchHandbook(chapters, "").hits).toHaveLength(0)
  })
})

const faqTravel: FaqFolder = {
  id: 1,
  name: "Resa och säkerhet",
  position: 1,
  questions: [
    {
      answer: [
        { children: [run("Resan arrangeras av kontingentledningen.")], kind: "paragraph" },
        {
          isOrdered: false,
          items: [{ children: [run("Tåget går från Malmö")], nested: [] }],
          kind: "list",
        },
      ],
      id: 11,
      title: "Vilka arrangerar min resa?",
    },
  ],
}

const faqHealth: FaqFolder = {
  id: 2,
  name: "Hälsa",
  position: 2,
  questions: [
    {
      answer: [{ children: [run("Sjukvården på lägret finns dygnet runt.")], kind: "paragraph" }],
      id: 21,
      title: "Vad händer om man blir sjuk?",
    },
  ],
}

describe("searchFaq", () => {
  it("finds nothing for an empty query", () => {
    expect(searchFaq([faqTravel, faqHealth], "")).toStrictEqual([])
  })

  it("finds a question and its answer alike, ignoring case, in reading order", () => {
    const hits = searchFaq([faqTravel, faqHealth], "RESA")

    expect(hits.map((hit) => [hit.question.id, hit.match])).toStrictEqual([
      [11, "resa"],
      [11, "Resa"],
    ])
  })

  it("reaches into a list's entries and names the folder it is in", () => {
    const [hit] = searchFaq([faqTravel, faqHealth], "malmö")

    expect(hit?.folder.name).toBe("Resa och säkerhet")
    expect([hit?.before, hit?.match, hit?.after]).toStrictEqual(["Tåget går från ", "Malmö", ""])
  })

  it("tells a Swedish letter from its plain cousin", () => {
    expect(searchFaq([faqTravel, faqHealth], "sjukvarden")).toStrictEqual([])
    expect(searchFaq([faqTravel, faqHealth], "SJUKVÅRDEN")).toHaveLength(1)
  })
})

describe("byPlace", () => {
  it("lists each place once, by its first hit, with how many more it holds", () => {
    const hits = [
      { id: 1, place: 7 },
      { id: 2, place: 7 },
      { id: 3, place: 3 },
      { id: 4, place: 7 },
    ]

    expect(byPlace(hits, (hit) => hit.place)).toStrictEqual([
      { first: { id: 1, place: 7 }, more: 2 },
      { first: { id: 3, place: 3 }, more: 0 },
    ])
  })
})
