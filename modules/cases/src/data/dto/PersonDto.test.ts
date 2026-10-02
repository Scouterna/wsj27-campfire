import { describe, expect, it } from "vitest"

import { toPeople, toPerson } from "./PersonDto"

/**
 * The null the service sends for an absent value, parsed rather than written, because
 * the code holds absence as undefined and the lint refuses a null literal.
 */
const wireNull: unknown = JSON.parse("null")

/**
 * A listing row as the participants service sends it at the basic level, overridable per
 * test.
 */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Lars Lindberg",
    member_no: 1_100_101,
    member_type: "Avdelningsledare",
    troop: "1",
    ...overrides,
  }
}

describe("reading one listing row", () => {
  it("reads the member number, the name, the role, and the unit", () => {
    expect(toPerson(row())).toEqual({
      memberNo: "1100101",
      name: "Lars Lindberg",
      role: "ledare",
      troop: "1",
    })
  })

  it("reads each member type as its role, and an unknown one as none", () => {
    expect(toPerson(row({ member_type: "Deltagare" }))?.role).toBe("deltagare")
    expect(toPerson(row({ member_type: "IST" }))?.role).toBe("ist")
    expect(toPerson(row({ member_type: "Kontingentledning" }))?.role).toBe("kontingentledning")
    expect(toPerson(row({ member_type: "Funktionär" }))).not.toHaveProperty("role")
  })

  it("accepts the member number as a string too – the service is not consistent", () => {
    expect(toPerson(row({ member_no: "1100101" }))?.memberNo).toBe("1100101")
  })

  it("reads an empty troop as no unit", () => {
    expect(toPerson(row({ troop: "" }))).not.toHaveProperty("troop")
  })

  it("drops a row without a member number or a name", () => {
    expect(toPerson(row({ member_no: undefined }))).toBeUndefined()
    expect(toPerson(row({ name: "  " }))).toBeUndefined()
    expect(toPerson(wireNull)).toBeUndefined()
  })
})

describe("reading everyone", () => {
  it("holds each person once, keyed by member number", () => {
    const people = toPeople([row(), row({ troop: "1" }), row({ member_no: 42, name: "Eva Ek" })])

    expect(people.keys().toArray()).toEqual(["1100101", "42"])
    expect(people.get("42")?.name).toBe("Eva Ek")
  })

  it("drops the unreadable rows, and reads anything that is not a list as nobody", () => {
    expect(toPeople([{ name: "No Number" }]).size).toBe(0)
    expect(toPeople({ detail: "Troop not found in project." }).size).toBe(0)
  })
})
