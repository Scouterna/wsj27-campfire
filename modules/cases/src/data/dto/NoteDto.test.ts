import { describe, expect, it } from "vitest"

import { toNote, toNotes } from "./NoteDto"

/**
 * The null the service sends for an absent value, parsed rather than written, because
 * the code holds absence as undefined and the lint refuses a null literal.
 */
const wireNull: unknown = JSON.parse("null")

/**
 * A note as the cases service sends it, overridable per test.
 */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 3,
    case_id: 7,
    created_at: "2026-09-26T12:05:00+00:00",
    creator_id: 1_100_101,
    secrecy_level: 5,
    title: "Feber",
    note: "38,5 på morgonen, vilar i tältet.",
    extra_access: [],
    tags: [],
    ...overrides,
  }
}

describe("reading one note", () => {
  it("reads the service's shape into the domain's", () => {
    expect(toNote(row())).toEqual({
      authorMemberNo: "1100101",
      caseId: "7",
      createdAt: new Date("2026-09-26T12:05:00Z"),
      id: "3",
      text: "38,5 på morgonen, vilar i tältet.",
      title: "Feber",
    })
  })

  it("reads a missing title as an empty one", () => {
    expect(toNote(row({ title: undefined }))?.title).toBe("")
  })

  it("drops a note without an identifier, a case, a time, an author, or a text", () => {
    expect(toNote(row({ id: undefined }))).toBeUndefined()
    expect(toNote(row({ case_id: undefined }))).toBeUndefined()
    expect(toNote(row({ created_at: undefined }))).toBeUndefined()
    expect(toNote(row({ creator_id: "" }))).toBeUndefined()
    expect(toNote(row({ note: wireNull }))).toBeUndefined()
  })
})

describe("reading a list of notes", () => {
  it("keeps the readable notes in the order they came, and drops the rest", () => {
    const rows = [row({ id: 5 }), wireNull, row({ id: 4 })]

    expect(toNotes(rows).map((note) => note.id)).toEqual(["5", "4"])
  })

  it("reads anything that is not a list as empty", () => {
    expect(toNotes(undefined)).toEqual([])
  })
})
