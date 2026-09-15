import { describe, expect, it } from "vitest"

import { hasAllRoles, hasAnyRole, leaderUnit } from "./roles"

describe("asking whether any of a set of kinds is held", () => {
  it("is true when one of the kinds is held", () => {
    expect(hasAnyRole([{ kind: "cmt" }, { kind: "admin" }], "admin", "program")).toBe(true)
  })

  it("is false when none of the kinds is held", () => {
    expect(hasAnyRole([{ kind: "cmt" }], "admin", "program")).toBe(false)
  })

  it("is false for an empty set of roles", () => {
    expect(hasAnyRole([], "admin")).toBe(false)
  })
})

describe("asking whether every one of a set of kinds is held", () => {
  it("is true when every kind is held", () => {
    expect(hasAllRoles([{ kind: "cmt" }, { kind: "admin" }], "cmt", "admin")).toBe(true)
  })

  it("is false when one of the kinds is missing", () => {
    expect(hasAllRoles([{ kind: "cmt" }], "cmt", "admin")).toBe(false)
  })

  it("is false for an empty set of roles", () => {
    expect(hasAllRoles([], "cmt")).toBe(false)
  })
})

describe("reading the unit a leader leads", () => {
  it("answers the unit when a leader role carries one", () => {
    expect(leaderUnit([{ kind: "leader", unitNumber: 18 }])).toBe(18)
  })

  it("answers undefined when the leader role carries no unit", () => {
    expect(leaderUnit([{ kind: "leader" }])).toBeUndefined()
  })

  it("answers the unit even when an unnumbered leader role comes first", () => {
    expect(leaderUnit([{ kind: "leader" }, { kind: "leader", unitNumber: 7 }])).toBe(7)
  })

  it("answers undefined when nobody holds the leader role", () => {
    expect(leaderUnit([{ kind: "cmt" }])).toBeUndefined()
  })
})
