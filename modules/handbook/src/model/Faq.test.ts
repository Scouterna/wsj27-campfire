import { describe, expect, it } from "vitest"

import { datedOf, newsOf, supportMail } from "./Faq"

describe("supportMail", () => {
  it("starts a mail to the contingent management, its subject spelled out with spaces", () => {
    const [address, query] = supportMail("Fråga om WSJ27 – Hälsa").split("?subject=", 2)

    expect(address).toBe("mailto:wsj@scouterna.se")
    expect(query).not.toContain("+")
    expect(decodeURIComponent(query ?? "")).toBe("Fråga om WSJ27 – Hälsa")
  })
})

describe("newsOf", () => {
  const question = {
    answer: [],
    changedAt: "2026-11-02T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    id: 1,
    title: "Hur lång är resan?",
  }

  it("calls a question published since new, and one saved since changed", () => {
    expect(newsOf(question, "2026-09-01T00:00:00.000Z")).toEqual({
      at: "2026-10-01T00:00:00.000Z",
      kind: "new",
    })
    expect(newsOf(question, "2026-10-15T00:00:00.000Z")).toEqual({
      at: "2026-11-02T00:00:00.000Z",
      kind: "changed",
    })
    expect(newsOf(question, "2026-11-03T00:00:00.000Z")).toBeUndefined()
  })

  it("counts a save on the day a question was published as part of publishing it", () => {
    const written = {
      ...question,
      changedAt: "2026-10-01T02:00:00.000Z",
      createdAt: "2026-10-01T00:00:00.000Z",
    }
    expect(newsOf(written, "2026-10-01T01:00:00.000Z")).toBeUndefined()
    expect(datedOf(written)).toEqual({ at: "2026-10-01T00:00:00.000Z", kind: "new" })
  })

  it("finds no news in a question the help center sent no moments for", () => {
    expect(
      newsOf(
        { ...question, changedAt: undefined, createdAt: undefined },
        "2000-01-01T00:00:00.000Z",
      ),
    ).toBeUndefined()
  })
})

describe("datedOf", () => {
  const question = { answer: [], id: 1, title: "Hur lång är resan?" }

  it("dates a question by its last save, however old", () => {
    expect(
      datedOf({
        ...question,
        changedAt: "2025-03-02T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toEqual({ at: "2025-03-02T00:00:00.000Z", kind: "changed" })
  })

  it("dates one never saved again by when it was published", () => {
    const at = "2025-01-01T00:00:00.000Z"
    expect(datedOf({ ...question, changedAt: at, createdAt: at })).toEqual({ at, kind: "new" })
    expect(datedOf({ ...question, createdAt: at })).toEqual({ at, kind: "new" })
  })

  it("dates nothing the help center sent no moments for", () => {
    expect(datedOf(question)).toBeUndefined()
  })
})
