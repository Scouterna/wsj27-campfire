import { describe, expect, it } from "vitest"

import type { Case } from "../model/Case"
import { canShare, type Reader } from "./case-roles"

const health: Case = {
  aboutMemberNos: [],
  createdAt: new Date(2027, 7, 1),
  creatorMemberNo: "1200001",
  extraAccess: [],
  id: "1",
  isClosed: false,
  secrecyLevel: 3,
  title: "Feber",
  troop: "2",
  type: "hälsa",
}

/**
 * A member of the health team, whom the service gives health and CMT cases.
 * @param memberNo Their member number.
 * @returns The reader.
 */
function healthTeam(memberNo: string): Reader {
  return { memberNo, roles: [{ kind: "cmt" }, { kind: "health" }], types: ["hälsa", "cmt"] }
}

/**
 * A member of CMT outside the health team, whom the service gives CMT cases alone.
 * @param memberNo Their member number.
 * @returns The reader.
 */
function management(memberNo: string): Reader {
  return { memberNo, roles: [{ kind: "cmt" }], types: ["cmt"] }
}

/**
 * The leader of a unit, whom the service gives unit cases.
 * @param memberNo Their member number.
 * @param unitNumber The unit they lead.
 * @returns The reader.
 */
function leader(memberNo: string, unitNumber: number): Reader {
  return { memberNo, roles: [{ kind: "leader", unitNumber }], types: ["avdelning"] }
}

describe("who may share a case", () => {
  it("lets the type's role holders share an open case", () => {
    expect(canShare(health, healthTeam("1200009"))).toBe(true)
    expect(canShare({ ...health, type: "cmt" }, management("1200401"))).toBe(true)
  })

  it("lets a unit's case be shared by its own unit's leaders alone", () => {
    const unit = { ...health, troop: "1", type: "avdelning" } as const

    expect(canShare(unit, leader("1100101", 1))).toBe(true)
    expect(canShare(unit, leader("1100201", 2))).toBe(false)
  })

  it("refuses someone outside the type's role, such as a management member on a health case", () => {
    expect(canShare(health, management("1200401"))).toBe(false)
    expect(
      canShare(health, { memberNo: "1200002", roles: [{ kind: "healthGrant" }], types: [] }),
    ).toBe(false)
  })

  it("refuses a closed case, and a level 4 case to anyone", () => {
    expect(canShare({ ...health, isClosed: true }, healthTeam("1200001"))).toBe(false)
    expect(canShare({ ...health, secrecyLevel: 4 }, healthTeam("1200001"))).toBe(false)
  })

  it("lets whoever the service gives a type it alone knows share its cases", () => {
    const safety = { ...health, type: "säkerhet" } as const

    expect(canShare(safety, { ...management("1200401"), types: ["cmt", "säkerhet"] })).toBe(true)
    expect(canShare(safety, healthTeam("1200001"))).toBe(false)
  })

  it("lets nobody share a case not bound to a unit until the service has said whose it is", () => {
    expect(canShare(health, { ...healthTeam("1200009"), types: undefined })).toBe(false)
  })

  it("lets only the creator share a private case", () => {
    const secret = { ...health, secrecyLevel: 5 } as const

    expect(canShare(secret, healthTeam("1200001"))).toBe(true)
    expect(canShare(secret, healthTeam("1200009"))).toBe(false)
  })
})
