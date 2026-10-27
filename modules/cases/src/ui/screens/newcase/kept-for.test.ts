import { describe, expect, it } from "vitest"

import type { Person } from "../../../model/Person"
import { keptFor } from "./kept-for"

const deltagare: Person = { memberNo: "1", name: "Ada", role: "deltagare", troop: "7" }
const leader: Person = { memberNo: "2", name: "Bo", role: "ledare", troop: "7" }
const elsewhere: Person = { memberNo: "3", name: "Cia", role: "deltagare", troop: "8" }

describe("what a new case keeps when its scope changes", () => {
  it("keeps everything while no scope is chosen", () => {
    const people = { kind: "people", people: [deltagare, leader, elsewhere] } as const
    const unit = { kind: "unit", unitNumber: 8 } as const

    expect(keptFor(people, undefined)).toBe(people)
    expect(keptFor(unit, undefined)).toBe(unit)
  })

  it("sets aside a leader and anyone outside the unit under a unit's scope", () => {
    const people = { kind: "people", people: [deltagare, leader, elsewhere] } as const

    expect(keptFor(people, { type: "avdelning", unitNumber: 7 })).toEqual({
      kind: "people",
      people: [deltagare],
    })
  })

  it("keeps anyone under a scope bound to no unit", () => {
    const people = { kind: "people", people: [deltagare, leader, elsewhere] } as const

    expect(keptFor(people, { type: "cmt" })).toEqual(people)
  })

  it("keeps a unit under a scope bound to no unit, and under its own unit's scope", () => {
    const unit = { kind: "unit", unitNumber: 7 } as const

    expect(keptFor(unit, { type: "hälsa" })).toBe(unit)
    expect(keptFor(unit, { type: "avdelning", unitNumber: 7 })).toBe(unit)
  })

  it("sets aside a unit under another unit's scope, leaving no one chosen", () => {
    expect(keptFor({ kind: "unit", unitNumber: 8 }, { type: "avdelning", unitNumber: 7 })).toEqual({
      kind: "people",
      people: [],
    })
  })
})
