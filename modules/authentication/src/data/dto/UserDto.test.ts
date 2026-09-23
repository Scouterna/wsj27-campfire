import { describe, expect, it } from "vitest"

import { decodeUser } from "./UserDto"

/**
 * A payload shaped exactly as the auth service answers, with the fields a test cares
 * about overridable one at a time.
 */
function userPayload(user: Readonly<Record<string, unknown>>): unknown {
  return {
    user: {
      email: "lars@example.com",
      familyName: "Larsson",
      givenName: "Lars",
      memberNo: "1001",
      name: "Lars Larsson",
      roles: ["wsj27:al:1"],
      ...user,
    },
  }
}

describe("reading the user the auth service reports", () => {
  it("decodes a payload it recognizes into the facts the application keeps", () => {
    const user = decodeUser(userPayload({}))

    expect(user).toEqual({
      firstName: "Lars",
      // How the person reads is derived at the decode too, so nothing downstream works
      // it out again.
      mark: { isLeader: true, unitNumber: 1 },
      memberNo: "1001",
      name: "Lars Larsson",
      roleLine: "Ledare",
      roleLineWithUnit: "Ledare · Avdelning 1",
      roles: [{ kind: "leader", unitNumber: 1 }],
      // A leader's unit comes straight from the roles, at the decode.
      unit: { number: 1 },
    })
  })

  it("degrades the optional fields rather than refusing the session", () => {
    const user = decodeUser({ user: { name: "Lars Larsson", roles: [] } })

    expect(user).toEqual({
      firstName: "Lars",
      memberNo: "",
      name: "Lars Larsson",
      roleLine: "Deltagare",
      roleLineWithUnit: "Deltagare",
      roles: [],
    })
  })

  it("names a management function on the role line, the head of contingent first", () => {
    const program = decodeUser(userPayload({ roles: ["wsj27:cmt", "wsj27:cmt:program"] }))
    const plain = decodeUser(userPayload({ roles: ["wsj27:cmt"] }))

    expect(program?.roleLine).toBe("CMT · Program")
    expect(program?.roleLineWithUnit).toBe("CMT · Program")
    // The management wears its own mark, which is no unit's.
    expect(program?.mark).toEqual({ isLeader: false })
    expect(plain?.roleLine).toBe("CMT")
  })

  it("reads as a leader when the roles carry a management function too", () => {
    const user = decodeUser(userPayload({ roles: ["wsj27:al:1", "wsj27:cmt:program"] }))

    expect(user?.roleLineWithUnit).toBe("Ledare · Avdelning 1")
    expect(user?.mark).toEqual({ isLeader: true, unitNumber: 1 })
  })

  it("derives the greeting name from the full name when no given name arrives", () => {
    const user = decodeUser(userPayload({ givenName: undefined, name: "  Anna   Andersson " }))

    expect(user?.firstName).toBe("Anna")
  })

  it("greets nobody rather than crashing when the name is empty", () => {
    const user = decodeUser({ user: { name: "", roles: [] } })

    expect(user?.firstName).toBe("")
  })

  it("translates the spellings it knows and drops everything else", () => {
    const user = decodeUser(userPayload({ roles: ["wsj27:al:1", 42, "junk"] }))

    expect(user?.roles).toEqual([{ kind: "leader", unitNumber: 1 }])
  })

  it("keeps the unit from a leader role even when a management role sits beside it", () => {
    // The unit is what the application shapes itself around, so it survives whatever
    // else the person also is.
    const user = decodeUser(userPayload({ roles: ["wsj27:al:1", "wsj27:cmt:program"] }))

    expect(user?.unit).toEqual({ number: 1 })
    expect(user?.roles).toEqual([
      { kind: "leader", unitNumber: 1 },
      { kind: "cmt" },
      { kind: "program" },
    ])
  })

  it("reads a payload with no user as nobody", () => {
    expect(decodeUser({})).toBeUndefined()
  })

  it("reads a user that is not an object as nobody", () => {
    expect(decodeUser({ user: "Lars Larsson" })).toBeUndefined()
  })

  it("reads a user with no name as nobody", () => {
    expect(decodeUser({ user: { roles: [] } })).toBeUndefined()
  })

  it("reads a user with no roles as nobody", () => {
    // An empty list is a session; a missing list is a payload this module does not know.
    expect(decodeUser({ user: { name: "Lars Larsson" } })).toBeUndefined()
  })
})
