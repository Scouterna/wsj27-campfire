import { describe, expect, it } from "vitest"

import { toCase, toCases } from "./CaseDto"

/**
 * The null the service sends for an absent value, parsed rather than written, because
 * the code holds absence as undefined and the lint refuses a null literal.
 */
const wireNull: unknown = JSON.parse("null")

/**
 * A case as the cases service sends it, overridable per test.
 */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    created_at: "2026-09-26T12:05:00.123456+00:00",
    creator_id: 1_100_101,
    secrecy_level: 5,
    title: "Feber",
    type: "hälsa",
    about_person_id: 1_100_111,
    assigned_to_id: wireNull,
    troop: "1",
    latest_note_at: "2026-09-26T12:05:01+00:00",
    closed: false,
    closed_at: wireNull,
    closed_by_id: wireNull,
    extra_access: [],
    tags: [],
    ...overrides,
  }
}

describe("reading one case", () => {
  it("reads the service's shape into the domain's", () => {
    expect(toCase(row())).toEqual({
      aboutMemberNo: "1100111",
      createdAt: new Date("2026-09-26T12:05:00.123Z"),
      creatorMemberNo: "1100101",
      id: "7",
      isClosed: false,
      latestNoteAt: new Date("2026-09-26T12:05:01Z"),
      title: "Feber",
      troop: "1",
    })
  })

  it("reads a closed case with the moment it closed and who closed it", () => {
    const closed = toCase(
      row({ closed: true, closed_at: "2026-09-27T08:00:00+00:00", closed_by_id: 1_200_001 }),
    )

    expect(closed?.isClosed).toBe(true)
    expect(closed?.closedAt).toEqual(new Date("2026-09-27T08:00:00Z"))
    expect(closed?.closedByMemberNo).toBe("1200001")
  })

  it("leaves out whom a case is about when it names nobody", () => {
    expect(toCase(row({ about_person_id: wireNull }))).not.toHaveProperty("aboutMemberNo")
  })

  it("leaves out the newest note's moment before the first note", () => {
    expect(toCase(row({ latest_note_at: wireNull }))).not.toHaveProperty("latestNoteAt")
  })

  it("reads a missing troop as no unit", () => {
    expect(toCase(row({ troop: undefined }))?.troop).toBe("")
  })

  it("drops a case without an identifier, a readable creation time, a creator, or a title", () => {
    expect(toCase(row({ id: undefined }))).toBeUndefined()
    expect(toCase(row({ created_at: "yesterday" }))).toBeUndefined()
    expect(toCase(row({ creator_id: wireNull }))).toBeUndefined()
    expect(toCase(row({ title: 42 }))).toBeUndefined()
  })

  it("drops anything that is not an object", () => {
    expect(toCase(wireNull)).toBeUndefined()
    expect(toCase("7")).toBeUndefined()
  })
})

describe("reading a list of cases", () => {
  it("keeps the readable cases in the order they came, and drops the rest", () => {
    const rows = [row({ id: 9 }), { id: 8 }, row({ id: 7 })]

    expect(toCases(rows).map((item) => item.id)).toEqual(["9", "7"])
  })

  it("reads anything that is not a list as empty", () => {
    expect(toCases({ detail: "Case not found" })).toEqual([])
  })
})
