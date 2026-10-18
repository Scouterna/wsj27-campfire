import { describe, expect, it } from "vitest"

import { toTarget, toTargets } from "./TargetDto"

/**
 * A basic-level listing row shaped as the participants service sends it, with the fields
 * a test cares about overridable one at a time.
 */
function row(fields: Readonly<Record<string, unknown>>): unknown {
  return {
    member_no: 1_100_101,
    member_type: "Avdelningsledare",
    name: "Lars Lindberg",
    roles: ["wsj27:al:1"],
    troop: "1",
    ...fields,
  }
}

describe("toTarget", () => {
  it("reads a leader with the unit their role names", () => {
    expect(toTarget(row({}))).toEqual({
      firstName: "Lars",
      memberNo: "1100101",
      name: "Lars Lindberg",
      roles: [{ kind: "leader", unitNumber: 1 }],
      unit: { number: 1 },
    })
  })

  it("reads a member of the contingent management with no unit", () => {
    const target = toTarget(
      row({
        member_no: "1200101",
        name: "Pernilla Palm",
        roles: ["wsj27:cmt:program:medlem"],
        troop: "",
      }),
    )
    expect(target).toEqual({
      firstName: "Pernilla",
      memberNo: "1200101",
      name: "Pernilla Palm",
      roles: [{ kind: "cmt" }, { kind: "program" }],
    })
  })

  it("takes the unit from the listing where the leader role names none", () => {
    expect(toTarget(row({ roles: ["wsj27:al"], troop: " 7 " }))?.unit).toEqual({ number: 7 })
  })

  it("prefers the role's unit to the listing's", () => {
    expect(toTarget(row({ roles: ["wsj27:al:3"], troop: "4" }))?.unit).toEqual({ number: 3 })
  })

  it("counts a role the application does not know, because the auth service does", () => {
    expect(toTarget(row({ roles: ["wsj27:access:något"], troop: "" }))).toEqual({
      firstName: "Lars",
      memberNo: "1100101",
      name: "Lars Lindberg",
      roles: [],
    })
  })

  it("drops a row the auth service would refuse to become", () => {
    expect(toTarget(row({ roles: [] }))).toBeUndefined()
    expect(toTarget(row({ roles: [42] }))).toBeUndefined()
    expect(toTarget(row({ roles: undefined }))).toBeUndefined()
  })

  it("drops a row without a member number or a name", () => {
    expect(toTarget(row({ member_no: undefined }))).toBeUndefined()
    expect(toTarget(row({ member_no: "12a" }))).toBeUndefined()
    expect(toTarget(row({ name: "  " }))).toBeUndefined()
    expect(toTarget("Lars")).toBeUndefined()
    // eslint-disable-next-line unicorn/no-null -- a payload the service could send
    expect(toTarget(null)).toBeUndefined()
  })
})

describe("toTargets", () => {
  it("keeps each person once, in the order they first appeared", () => {
    const targets = toTargets([
      row({ member_no: 2, name: "Bo Berg" }),
      row({ member_no: 1, name: "Anna Ask" }),
      row({ member_no: 2, name: "Bo Berg" }),
    ])
    expect(targets.map((target) => target.memberNo)).toEqual(["2", "1"])
  })

  it("drops the rows it cannot read and keeps the rest", () => {
    expect(toTargets([row({ name: "" }), row({})])).toHaveLength(1)
  })

  it("reads anything but a list as nobody", () => {
    expect(toTargets({ rows: [row({})] })).toEqual([])
  })
})
