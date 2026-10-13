import { describe, expect, it } from "vitest"

import { isSecrecyLevel, levelChoice, levelsFor, noteAudience, noteLevels } from "./SecrecyLevel"

describe("offering a level", () => {
  it("names who sees the case at each level, for the case's own group", () => {
    const unit = { type: "avdelning", unitNumber: 7 } as const

    expect(levelChoice(3, { type: "hälsa" }).title).toBe("Hälsoteamet")
    expect(levelChoice(3, unit).title).toBe("Ledarna i avdelning 7")
    expect(levelChoice(4, { type: "cmt" }).title).toBe("Bara CMT")
    expect(levelChoice(4, unit).title).toBe("Bara ledarna i avdelning 7")
    expect(levelChoice(5, unit).title).toBe("Bara du")
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
    expect(noteAudience(3, 3, { type: "hälsa" })).toBe("Alla")
    expect(noteAudience(4, 3, { type: "hälsa" })).toBe("Bara hälsoteamet")
    expect(noteAudience(5, 3, { type: "hälsa" })).toBe("Bara du")
    expect(noteAudience(4, 4, { type: "cmt" })).toBe("Alla")
  })
})

describe("the levels a case may be opened at", () => {
  it("offers every level for a group's case, and leaves a unit's leaders alone out", () => {
    expect(levelsFor({ type: "hälsa" })).toEqual([3, 4, 5])
    expect(levelsFor({ type: "cmt" })).toEqual([3, 4, 5])
    expect(levelsFor({ type: "avdelning", unitNumber: 1 })).toEqual([3, 5])
  })
})
