import { describe, expect, it } from "vitest"

import { allHoldersOf, canBeAbout, holdersOf, inFormOrder, isCaseType, scopeName } from "./CaseType"

describe("naming a scope", () => {
  it("names each type, and a unit's case by its unit", () => {
    expect(scopeName({ type: "hälsa" })).toBe("Hälsa")
    expect(scopeName({ type: "cmt" })).toBe("CMT")
    expect(scopeName({ type: "avdelning", unitNumber: 7 })).toBe("Avdelning 7")
  })

  it("names a type it does not know by its own name, and its people as its group", () => {
    const safety = { type: "säkerhet" }

    expect(scopeName(safety)).toBe("Säkerhet")
    expect(holdersOf(safety)).toBe("gruppen Säkerhet")
    expect(allHoldersOf(safety)).toBe("hela gruppen Säkerhet")
  })
})

describe("reading a type", () => {
  it("takes any name the service gives, but nothing that names no type", () => {
    expect(isCaseType("hälsa")).toBe(true)
    expect(isCaseType("säkerhet")).toBe(true)
    expect(isCaseType(" ")).toBe(false)
    expect(isCaseType(7)).toBe(false)
  })

  it("offers the known types in their own order, and any other after them as given", () => {
    expect(inFormOrder(["cmt", "säkerhet", "hälsa", "logistik", "cmt"])).toEqual([
      "hälsa",
      "cmt",
      "säkerhet",
      "logistik",
    ])
  })
})

describe("who a case can be about", () => {
  const unit = { type: "avdelning", unitNumber: 1 } as const
  const ester = { memberNo: "1300035", name: "Ester Dahl", role: "deltagare", troop: "1" } as const
  const hanna = {
    memberNo: "1100402",
    name: "Hanna Hellström",
    role: "ledare",
    troop: "1",
  } as const
  const molly = {
    memberNo: "1300140",
    name: "Molly Sundqvist",
    role: "deltagare",
    troop: "2",
  } as const

  it("keeps a unit's case to the unit's own deltagare", () => {
    expect(canBeAbout(unit, ester)).toBe(true)
    expect(canBeAbout(unit, hanna)).toBe(false)
    expect(canBeAbout(unit, molly)).toBe(false)
  })

  it("lets any other case be about anyone", () => {
    expect(canBeAbout({ type: "hälsa" }, hanna)).toBe(true)
    expect(canBeAbout({ type: "cmt" }, molly)).toBe(true)
    expect(canBeAbout({ type: "säkerhet" }, ester)).toBe(true)
  })
})
