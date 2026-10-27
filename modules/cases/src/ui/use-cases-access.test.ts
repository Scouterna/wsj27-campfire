import { describe, expect, it } from "vitest"

import { hasCaseType } from "./use-cases-access"

describe("asking whether the roles reach any kind of case", () => {
  it("is true for anyone in the management, and a leader of a numbered unit", () => {
    expect(hasCaseType([{ kind: "cmt" }])).toBe(true)
    expect(hasCaseType([{ kind: "leader", unitNumber: 7 }])).toBe(true)
  })

  it("is false for a leader without a unit, and for someone with neither", () => {
    expect(hasCaseType([{ kind: "leader" }])).toBe(false)
    expect(hasCaseType([{ kind: "admin" }])).toBe(false)
    expect(hasCaseType([])).toBe(false)
  })
})
