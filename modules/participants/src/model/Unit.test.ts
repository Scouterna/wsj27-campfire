import { describe, expect, it } from "vitest"

import { unitNumbered } from "./Unit"

describe("a unit by its number", () => {
  it("names a unit the contingent names", () => {
    expect(unitNumbered(1)).toEqual({ name: "Björnen", number: 1 })
    expect(unitNumbered(53)).toEqual({ name: "Staren", number: 53 })
  })

  it("leaves a number the contingent has not named without a name", () => {
    expect(unitNumbered(54)).toEqual({ number: 54 })
  })
})
