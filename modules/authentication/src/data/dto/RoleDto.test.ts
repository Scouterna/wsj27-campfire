import { describe, expect, it } from "vitest"

import { toRoles } from "./RoleDto"

describe("translating a provider spelling into roles", () => {
  it("reads a bare leader role as a leader with no unit", () => {
    expect(toRoles("wsj27:al")).toEqual([{ kind: "leader" }])
  })

  it("reads a unit-scoped leader role as a leader of that unit", () => {
    expect(toRoles("wsj27:al:18")).toEqual([{ kind: "leader", unitNumber: 18 }])
  })

  it("reads a leader role with an unreadable unit as a leader with no unit", () => {
    // A data gap upstream – still a leader, never nobody.
    expect(toRoles("wsj27:al:unknown")).toEqual([{ kind: "leader" }])
  })

  it("reads bare cmt as contingent management and nothing else", () => {
    expect(toRoles("wsj27:cmt")).toEqual([{ kind: "cmt" }])
  })

  it("reads cmt at any depth as contingent management", () => {
    expect(toRoles("wsj27:cmt:program:medlem")).toEqual([{ kind: "cmt" }, { kind: "program" }])
  })

  it("grants admin its own kind plus cmt, deeper segments and all", () => {
    expect(toRoles("wsj27:cmt:admin:fa")).toEqual([{ kind: "cmt" }, { kind: "admin" }])
  })

  it("grants communication its own kind plus cmt", () => {
    expect(toRoles("wsj27:cmt:kommunikation")).toEqual([{ kind: "cmt" }, { kind: "communication" }])
  })

  it("grants head of contingent its own kind plus cmt", () => {
    expect(toRoles("wsj27:cmt:hoc:hoc")).toEqual(toRoles("wsj27:cmt:kontingentledare"))
    expect(toRoles("wsj27:cmt:kontingentledare")).toEqual([
      { kind: "cmt" },
      { kind: "headOfContingent" },
    ])
  })

  it("grants program its own kind plus cmt", () => {
    expect(toRoles("wsj27:cmt:program")).toEqual([{ kind: "cmt" }, { kind: "program" }])
  })

  it("grants unit support its own kind plus cmt", () => {
    expect(toRoles("wsj27:cmt:support:avdelningssupport")).toEqual([
      { kind: "cmt" },
      { kind: "unitSupport" },
    ])
  })

  it("grants health its own kind plus cmt, from the support function", () => {
    expect(toRoles("wsj27:cmt:support:halsa")).toEqual([{ kind: "cmt" }, { kind: "health" }])
  })

  it("grants IST support its own kind plus cmt", () => {
    expect(toRoles("wsj27:cmt:support:ist-support")).toEqual([
      { kind: "cmt" },
      { kind: "istSupport" },
    ])
  })

  it("reads a support member with no named roll as cmt alone", () => {
    expect(toRoles("wsj27:cmt:support")).toEqual([{ kind: "cmt" }])
  })

  it("reads the personal health grant as health, and nothing else", () => {
    expect(toRoles("wsj27:access:Hälsa plus intern information")).toEqual([{ kind: "health" }])
  })

  it("reads any other access level as no role at all", () => {
    expect(toRoles("wsj27:access:Intern information")).toEqual([])
  })

  it("never matches by string prefix", () => {
    // "wsj27:cmtx" starts with the same characters as "wsj27:cmt" but is a different
    // segment entirely.
    expect(toRoles("wsj27:cmtx")).toEqual([])
  })

  it("reads a realm role outside the wsj27 namespace as no role at all", () => {
    expect(toRoles("offline_access")).toEqual([])
  })

  it("reads an unrecognized wsj27 spelling as no role at all", () => {
    expect(toRoles("wsj27:bulkread")).toEqual([])
  })
})
