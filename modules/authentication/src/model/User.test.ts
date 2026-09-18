import { describe, expect, it } from "vitest"

import { markFor, roleLineFor, roleLineWithUnitFor } from "./User"

describe("the line that says what somebody is", () => {
  it("reads a leader as a leader, whatever else they also are", () => {
    expect(roleLineFor([{ kind: "leader", unitNumber: 1 }])).toBe("Ledare")
    expect(roleLineFor([{ kind: "cmt" }, { kind: "program" }, { kind: "leader" }])).toBe("Ledare")
  })

  it("names the management function, and the head of contingent before any other", () => {
    expect(roleLineFor([{ kind: "cmt" }, { kind: "health" }])).toBe("CMT · Hälsosupport")
    expect(roleLineFor([{ kind: "cmt" }, { kind: "health" }, { kind: "headOfContingent" }])).toBe(
      "CMT · HoC",
    )
    expect(roleLineFor([{ kind: "cmt" }])).toBe("CMT")
  })

  it("reads anybody else as a participant", () => {
    expect(roleLineFor([])).toBe("Deltagare")
  })

  it("puts a unit on a leader's line and on nobody else's", () => {
    expect(roleLineWithUnitFor([{ kind: "leader" }], { number: 7 })).toBe("Ledare · Avdelning 7")
    expect(roleLineWithUnitFor([{ kind: "leader" }], undefined)).toBe("Ledare")
    expect(roleLineWithUnitFor([{ kind: "cmt" }], { number: 7 })).toBe("CMT")
    expect(roleLineWithUnitFor([], { number: 7 })).toBe("Deltagare")
  })
})

describe("the mark somebody wears", () => {
  it("is their unit's, starred for a leader", () => {
    expect(markFor([{ kind: "leader", unitNumber: 3 }], { number: 3 })).toEqual({
      isLeader: true,
      unitNumber: 3,
    })
    expect(markFor([], { number: 3 })).toEqual({ isLeader: false, unitNumber: 3 })
  })

  it("is the unit's before the management's when somebody has both", () => {
    expect(markFor([{ kind: "cmt" }], { number: 3 })).toEqual({ isLeader: false, unitNumber: 3 })
  })

  it("is the management's own without a unit, and nothing for anybody else", () => {
    expect(markFor([{ kind: "cmt" }], undefined)).toEqual({ isLeader: false })
    expect(markFor([], undefined)).toBeUndefined()
  })
})
