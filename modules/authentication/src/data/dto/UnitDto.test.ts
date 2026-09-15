import { describe, expect, it } from "vitest"

import { toUnit } from "./UnitDto"

describe("reading the unit out of the register's answer", () => {
  it("reads a troop that names a unit", () => {
    expect(toUnit({ troop: "1" })).toEqual({ number: 1 })
  })

  it("reads a padded troop number as the number it names", () => {
    expect(toUnit({ troop: "07" })).toEqual({ number: 7 })
  })

  it("reads an empty troop as no unit", () => {
    expect(toUnit({ troop: "" })).toBeUndefined()
  })

  it("reads a record with no troop at all as no unit", () => {
    expect(toUnit({})).toBeUndefined()
  })

  it("reads a troop that is not a string as no unit", () => {
    // The wire promises a string; a number is a shape this converter does not trust.
    expect(toUnit({ troop: 42 })).toBeUndefined()
  })

  it("reads a member type as no unit", () => {
    // IST is a troop to the register and no unit to Campfire.
    expect(toUnit({ troop: "IST" })).toBeUndefined()
  })

  it("reads a troop that only starts with digits as no unit", () => {
    expect(toUnit({ troop: "1a" })).toBeUndefined()
  })
})
