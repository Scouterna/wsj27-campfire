import { describe, expect, it } from "vitest"

import { canBeAbout, isCaseType, scopeName } from "./CaseType"

describe("naming a scope", () => {
  it("names each type, and a unit's case by its unit", () => {
    expect(scopeName({ type: "hälsa" })).toBe("Hälsa")
    expect(scopeName({ type: "cmt" })).toBe("CMT")
    expect(scopeName({ type: "avdelning", unitNumber: 7 })).toBe("Avdelning 7")
  })
})

describe("reading a type", () => {
  it("knows the service's types and nothing else", () => {
    expect(isCaseType("hälsa")).toBe(true)
    expect(isCaseType("admin")).toBe(false)
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
  })
})
