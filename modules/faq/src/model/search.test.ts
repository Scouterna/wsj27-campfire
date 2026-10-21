import { describe, expect, it } from "vitest"

import type { FaqFolder } from "./Faq"
import type { Inline } from "./RichText"
import { searchFaq } from "./search"

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

const travel: FaqFolder = {
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

const health: FaqFolder = {
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
    expect(searchFaq([travel, health], "")).toStrictEqual([])
  })

  it("finds a question and its answer alike, ignoring case, in reading order", () => {
    const hits = searchFaq([travel, health], "RESA")

    expect(hits.map((hit) => [hit.question.id, hit.match])).toStrictEqual([
      [11, "resa"],
      [11, "Resa"],
    ])
  })

  it("reaches into a list's entries and names the folder it is in", () => {
    const [hit] = searchFaq([travel, health], "malmö")

    expect(hit?.folder.name).toBe("Resa och säkerhet")
    expect([hit?.before, hit?.match, hit?.after]).toStrictEqual(["Tåget går från ", "Malmö", ""])
  })

  it("tells a Swedish letter from its plain cousin", () => {
    expect(searchFaq([travel, health], "sjukvarden")).toStrictEqual([])
    expect(searchFaq([travel, health], "SJUKVÅRDEN")).toHaveLength(1)
  })
})
