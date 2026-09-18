import { describe, expect, it } from "vitest"

import type { Participant } from "./Participant"
import { unitEntries, unitGroup } from "./unit-entries"

/**
 * A person as a listing row converts to, overridable per case.
 */
function person(overrides: Partial<Participant> = {}): Participant {
  return {
    memberNo: "1100101",
    firstName: "Alva",
    lastName: "Axelsson",
    role: "deltagare",
    ...overrides,
  }
}

const contingent = [
  person({ memberNo: "a", unitNumber: 2 }),
  person({ memberNo: "b", role: "kontingentledning" }),
  person({ memberNo: "c", unitNumber: 1, role: "ledare" }),
  person({ memberNo: "d", unitNumber: 2 }),
  person({ memberNo: "e", role: "ist" }),
  person({ memberNo: "f", unitNumber: 1 }),
  person({ memberNo: "g", role: "ist" }),
]

describe("the unit browser's entries", () => {
  it("lists the units ascending, then the IST, then the management", () => {
    expect(unitEntries(contingent)).toEqual([
      { key: "1", label: "Avdelning 1", count: 2 },
      { key: "2", label: "Avdelning 2", count: 2 },
      { key: "ist", label: "IST", count: 2 },
      { key: "cmt", label: "CMT", count: 1 },
    ])
  })

  it("counts everybody exactly once", () => {
    const counted = unitEntries(contingent).reduce((total, entry) => total + entry.count, 0)

    expect(counted).toBe(contingent.length)
  })

  it("leaves out an entry nobody is in", () => {
    const oneUnit = [person({ memberNo: "a", unitNumber: 7 })]

    expect(unitEntries(oneUnit)).toEqual([{ key: "7", label: "Avdelning 7", count: 1 }])
  })

  it("has nothing to list for nobody", () => {
    expect(unitEntries([])).toEqual([])
  })

  it("holds no entry for a deltagare the service placed in no unit", () => {
    // The one way the counts can fall short of the whole – the participants service
    // sends a unit for every deltagare and ledare it knows.
    expect(unitEntries([person({ memberNo: "a" })])).toEqual([])
  })
})

describe("the people behind an entry's key", () => {
  it("answers a unit's people and its label", () => {
    expect(unitGroup(contingent, "2")).toEqual({
      label: "Avdelning 2",
      people: [contingent[0], contingent[3]],
    })
  })

  it("answers the IST by their role rather than by a number", () => {
    expect(unitGroup(contingent, "ist")?.people.map((one) => one.memberNo)).toEqual(["e", "g"])
  })

  it("answers the management", () => {
    expect(unitGroup(contingent, "cmt")).toEqual({
      label: "CMT",
      people: [contingent[1]],
    })
  })

  it("keeps the order it was handed", () => {
    expect(unitGroup(contingent, "1")?.people.map((one) => one.memberNo)).toEqual(["c", "f"])
  })

  it("answers nothing for a key no entry holds", () => {
    expect(unitGroup(contingent, "99")).toBeUndefined()
    expect(unitGroup(contingent, "avdelning")).toBeUndefined()
    expect(unitGroup([], "ist")).toBeUndefined()
  })
})
