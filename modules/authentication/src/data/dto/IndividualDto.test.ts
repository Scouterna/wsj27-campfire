import { describe, expect, it } from "vitest"

import { toRegistration, toTravel, toUnit } from "./IndividualDto"

describe("reading the unit out of the participants service's answer", () => {
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
    // IST is a troop to the list of participants and no unit to Campfire.
    expect(toUnit({ troop: "IST" })).toBeUndefined()
  })

  it("reads a troop that only starts with digits as no unit", () => {
    expect(toUnit({ troop: "1a" })).toBeUndefined()
  })
})

describe("reading the travel package out of the same answer", () => {
  it("reads each spelling the service normalizes to", () => {
    expect(toTravel({ participation_type: "Rundresa" })).toBe("rundresa")
    expect(toTravel({ participation_type: "Direktresa" })).toBe("direktresa")
    expect(toTravel({ participation_type: "Egen resa" })).toBe("egenResa")
  })

  it("reads the empty string the management's rows carry as no package", () => {
    expect(toTravel({ participation_type: "" })).toBeUndefined()
  })

  it("reads a record with no package at all as none", () => {
    expect(toTravel({})).toBeUndefined()
  })

  it("reads a spelling it does not know as no package", () => {
    // Nobody is put on a bus by a value the application never promised to understand.
    expect(toTravel({ participation_type: "Tåg" })).toBeUndefined()
    expect(toTravel({ participation_type: 7 })).toBeUndefined()
  })
})

describe("reading the whole registration", () => {
  it("carries both facts when the record holds both", () => {
    expect(toRegistration({ participation_type: "Rundresa", troop: "2" })).toEqual({
      travel: "rundresa",
      unit: { number: 2 },
    })
  })

  it("leaves out what the record does not hold, down to nothing at all", () => {
    expect(toRegistration({ troop: "IST" })).toEqual({})
    expect(toRegistration({})).toEqual({})
  })
})
