import { describe, expect, it } from "vitest"

import { nameOf, placingLine, unitNumberOf, unitTag, type People, type Person } from "./Person"

const people: People = new Map([
  ["1100101", { memberNo: "1100101", name: "Lars Lindberg", troop: "1" }],
])

describe("naming somebody by member number", () => {
  it("reads the name the list of participants holds", () => {
    expect(nameOf(people, "1100101")).toBe("Lars Lindberg")
  })

  it("falls back to the number for somebody the list does not hold", () => {
    expect(nameOf(people, "42")).toBe("Medlem 42")
  })

  it("falls back to the number while the list is still loading", () => {
    expect(nameOf(undefined, "1100101")).toBe("Medlem 1100101")
  })
})

const leader: Person = { memberNo: "1100101", name: "Lars Lindberg", role: "ledare", troop: "1" }
const ist: Person = { memberNo: "1300098", name: "Freja Sandberg", role: "ist", troop: "IST" }

describe("placing somebody in a unit", () => {
  it("reads a troop of digits as the unit", () => {
    expect(unitNumberOf(leader)).toBe(1)
    expect(unitTag(leader)).toBe("Avd 1")
  })

  it("tags nobody in the reader's own unit, and everybody in another", () => {
    expect(unitTag(leader, 1)).toBeUndefined()
    expect(unitTag(leader, 2)).toBe("Avd 1")
  })

  it("places nobody in a unit by a troop that is not a number", () => {
    expect(unitNumberOf(ist)).toBeUndefined()
    expect(unitTag(ist)).toBeUndefined()
  })
})

describe("writing the line under a name", () => {
  it("joins the role, the unit, and the unit's name", () => {
    expect(placingLine(leader, () => "Ankan")).toBe("Ledare · Avdelning 1 · Ankan")
  })

  it("leaves out the name of a unit the contingent has not named", () => {
    const otherUnits = new Map([[2, "Myran"]])
    expect(placingLine(leader, (unit) => otherUnits.get(unit))).toBe("Ledare · Avdelning 1")
  })

  it("leaves out the reader's own unit, and only theirs", () => {
    expect(placingLine(leader, () => "Ankan", 1)).toBe("Ledare")
    expect(placingLine(leader, () => "Ankan", 2)).toBe("Ledare · Avdelning 1 · Ankan")
  })

  it("says only the role for somebody outside the units", () => {
    expect(placingLine(ist, () => "Ankan")).toBe("IST")
  })

  it("names a management member's function after their role", () => {
    const helena: Person = {
      funktion: "Hälsosupport",
      memberNo: "1200001",
      name: "Helena Hägg",
      role: "kontingentledning",
    }
    expect(placingLine(helena, () => "Ankan")).toBe("CMT · Hälsosupport")
  })

  it("says nothing for somebody the module does not know", () => {
    expect(placingLine(undefined, () => "Ankan")).toBeUndefined()
  })
})
