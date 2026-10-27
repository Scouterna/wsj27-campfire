import { describe, expect, it } from "vitest"

import { isSecrecyLevel, levelChoice, levelsFor, noteAudience, noteLevels } from "./SecrecyLevel"

describe("offering a level", () => {
  it("says under each level who sees the case and who it can be shared with", () => {
    expect(levelChoice(3, { type: "cmt" }).description).toBe(
      "Alla i CMT ser ärendet. Du kan också dela det med ledarna i de berörda avdelningarna.",
    )
    expect(levelChoice(4, { type: "hälsa" }).description).toBe(
      "Alla i hälsoteamet ser ärendet, men det kan aldrig delas med någon annan.",
    )
    expect(levelChoice(5, { type: "avdelning", unitNumber: 7 }).description).toBe(
      "Ingen annan ser ärendet förrän du delar det med en annan ledare i avdelningen.",
    )
    expect(levelChoice(3, { type: "säkerhet" }).description).toBe(
      "Alla i gruppen Säkerhet ser ärendet. Du kan också dela det med enskilda ledare och personer i CMT.",
    )
  })

  it("names who sees the case at each level, for the case's own group", () => {
    const unit = { type: "avdelning", unitNumber: 7 } as const

    expect(levelChoice(3, { type: "hälsa" }).title).toBe("Hälsoteamet")
    expect(levelChoice(3, unit).title).toBe("Ledarna i avdelning 7")
    expect(levelChoice(4, { type: "cmt" }).title).toBe("Bara CMT")
    expect(levelChoice(4, unit).title).toBe("Bara ledarna i avdelning 7")
    expect(levelChoice(5, unit).title).toBe("Bara du")
  })

  it("names a type it does not know by its group", () => {
    const safety = { type: "säkerhet" }

    expect(levelChoice(3, safety).title).toBe("Gruppen Säkerhet")
    expect(levelChoice(4, safety).title).toBe("Bara gruppen Säkerhet")
    expect(noteAudience(4, 3, safety)).toBe("Bara gruppen Säkerhet")
  })
})

describe("reading a level", () => {
  it("knows the levels in use and nothing else", () => {
    expect([3, 4, 5].every((level) => isSecrecyLevel(level))).toBe(true)
    expect(isSecrecyLevel(2)).toBe(false)
    expect(isSecrecyLevel("3")).toBe(false)
  })
})

describe("the levels a note may be written at", () => {
  const health = { type: "hälsa" } as const
  const unit = { type: "avdelning", unitNumber: 1 } as const

  it("offers a role holder the case's own level and every one above it", () => {
    expect(noteLevels(3, health, true)).toEqual([3, 4, 5])
    expect(noteLevels(4, health, true)).toEqual([4, 5])
    expect(noteLevels(5, health, true)).toEqual([5])
  })

  it("keeps someone the case is only shared with from shutting the others out", () => {
    expect(noteLevels(3, health, false)).toEqual([3, 5])
  })

  it("offers no note for a unit's leaders alone, since all of them read the case", () => {
    expect(noteLevels(3, unit, true)).toEqual([3, 5])
  })

  it("names who reads a note at each level", () => {
    expect(noteAudience(3, 3, { type: "hälsa" })).toBe("Alla som ser ärendet")
    expect(noteAudience(4, 3, { type: "hälsa" })).toBe("Bara hälsoteamet")
    expect(noteAudience(5, 3, { type: "hälsa" })).toBe("Bara du")
    expect(noteAudience(4, 4, { type: "cmt" })).toBe("Alla som ser ärendet")
  })
})

describe("the levels a case may be opened at", () => {
  it("offers every level for a group's case, and leaves a unit's leaders alone out", () => {
    expect(levelsFor({ type: "hälsa" })).toEqual([3, 4, 5])
    expect(levelsFor({ type: "cmt" })).toEqual([3, 4, 5])
    expect(levelsFor({ type: "avdelning", unitNumber: 1 })).toEqual([3, 5])
    expect(levelsFor({ type: "säkerhet" })).toEqual([3, 4, 5])
  })
})
