import { describe, expect, it } from "vitest"

import type { Participant } from "./Participant"
import { findGroup, groupEntries, istPatrolOf, unitNumberOf } from "./groups"

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
  person({ memberNo: "a", unit: { number: 2 } }),
  person({ memberNo: "b", role: "kontingentledning" }),
  person({ memberNo: "c", unit: { number: 1 }, role: "ledare" }),
  person({ memberNo: "d", unit: { number: 2 } }),
  person({ istPatrol: { number: 12 }, memberNo: "e", role: "ist" }),
  person({ memberNo: "f", unit: { number: 1 } }),
  person({ memberNo: "g", role: "ist" }),
  // Numbered like unit 1, which the patrols' own series overlaps.
  person({ istPatrol: { number: 1 }, memberNo: "h", role: "ist" }),
  person({ funktion: "program", memberNo: "i", role: "kontingentledning" }),
  person({ funktion: "kontingentledare", memberNo: "j", role: "kontingentledning" }),
]

describe("the groups view's entries", () => {
  it("lists the units, then the IST patrols and the rest of the IST, then the management by funktion", () => {
    expect(groupEntries(contingent)).toEqual([
      { count: 2, kind: "avdelningar", key: "1", label: "Avdelning 1", name: "Björnen" },
      { count: 2, kind: "avdelningar", key: "2", label: "Avdelning 2", name: "Bävern" },
      { count: 1, kind: "ist", key: "ist-1", label: "IST-patrull 1", name: "Ekoxe" },
      { count: 1, kind: "ist", key: "ist-12", label: "IST-patrull 12", name: "Raggbock" },
      { count: 1, kind: "ist", key: "ist", label: "IST utan patrull" },
      { count: 1, kind: "cmt", key: "cmt-kontingentledare", label: "HoC" },
      { count: 1, kind: "cmt", key: "cmt-program", label: "Program" },
      { count: 1, kind: "cmt", key: "cmt-ovriga", label: "Övriga" },
    ])
  })

  it("counts everybody exactly once", () => {
    const counted = groupEntries(contingent).reduce((total, entry) => total + entry.count, 0)

    expect(counted).toBe(contingent.length)
  })

  it("leaves out an entry nobody is in", () => {
    const oneUnit = [person({ memberNo: "a", unit: { number: 7 } })]

    expect(groupEntries(oneUnit)).toEqual([
      { count: 1, kind: "avdelningar", key: "7", label: "Avdelning 7", name: "Vildsvinet" },
    ])
  })

  it("has nothing to list for nobody", () => {
    expect(groupEntries([])).toEqual([])
  })

  it("holds no entry for a deltagare the service placed in no unit", () => {
    // The one way the counts can fall short of the whole – the participants service
    // sends a unit for every deltagare and ledare it knows.
    expect(groupEntries([person({ memberNo: "a" })])).toEqual([])
  })
})

describe("the unit a key names", () => {
  it("reads a unit's number", () => {
    expect(unitNumberOf("3")).toBe(3)
  })

  it("names no unit for the IST, the management, or a key that is no number", () => {
    expect(unitNumberOf("ist-1")).toBeUndefined()
    expect(unitNumberOf("ist")).toBeUndefined()
    expect(unitNumberOf("cmt-program")).toBeUndefined()
    expect(unitNumberOf("3a")).toBeUndefined()
    expect(unitNumberOf("")).toBeUndefined()
  })
})

describe("the IST patrol a key names", () => {
  it("reads a patrol's number", () => {
    expect(istPatrolOf("ist-12")).toBe(12)
  })

  it("names no patrol for a unit, the rest of the IST, the management, or a malformed key", () => {
    expect(istPatrolOf("12")).toBeUndefined()
    expect(istPatrolOf("ist")).toBeUndefined()
    expect(istPatrolOf("cmt-program")).toBeUndefined()
    expect(istPatrolOf("ist-")).toBeUndefined()
    expect(istPatrolOf("ist-1a")).toBeUndefined()
  })
})

describe("the people behind an entry's key", () => {
  it("answers a unit's people and its label", () => {
    expect(findGroup(contingent, "2")).toEqual({
      label: "Avdelning 2",
      people: [contingent[0], contingent[3]],
    })
  })

  it("answers an IST patrol's people and its label", () => {
    expect(findGroup(contingent, "ist-12")).toEqual({
      label: "IST-patrull 12",
      people: [contingent[4]],
    })
  })

  it("never mixes an IST patrol with the unit of the same number", () => {
    expect(findGroup(contingent, "1")?.people.map((one) => one.memberNo)).toEqual(["c", "f"])
    expect(findGroup(contingent, "ist-1")?.people.map((one) => one.memberNo)).toEqual(["h"])
  })

  it("answers the IST outside every patrol together", () => {
    expect(findGroup(contingent, "ist")).toEqual({
      label: "IST utan patrull",
      people: [contingent[6]],
    })
  })

  it("answers a funktion of the management, and the members the roster has not detailed", () => {
    expect(findGroup(contingent, "cmt-program")).toEqual({
      label: "Program",
      people: [contingent[8]],
    })
    expect(findGroup(contingent, "cmt-ovriga")).toEqual({
      label: "Övriga",
      people: [contingent[1]],
    })
  })

  it("keeps the order it was handed", () => {
    expect(findGroup(contingent, "1")?.people.map((one) => one.memberNo)).toEqual(["c", "f"])
  })

  it("answers nothing for a key no entry holds", () => {
    expect(findGroup(contingent, "99")).toBeUndefined()
    expect(findGroup(contingent, "avdelning")).toBeUndefined()
    expect(findGroup([], "ist")).toBeUndefined()
    expect(findGroup(contingent, "ist-2")).toBeUndefined()
    expect(findGroup(contingent, "cmt")).toBeUndefined()
    expect(findGroup(contingent, "cmt-admin")).toBeUndefined()
    expect(findGroup(contingent, "cmt-administration")).toBeUndefined()
  })
})
