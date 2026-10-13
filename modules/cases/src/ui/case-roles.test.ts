import { describe, expect, it } from "vitest"

import type { Case } from "../model/Case"
import { canShare } from "./case-roles"

const health: Case = {
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
const healthTeam = [{ kind: "cmt" }, { kind: "health" }] as const

describe("who may share a case", () => {
  it("lets the type's role holders share an open case", () => {
    expect(canShare(health, healthTeam, "1200009")).toBe(true)
    expect(canShare({ ...health, type: "cmt" }, [{ kind: "cmt" }], "1200401")).toBe(true)
  })

  it("lets a unit's case be shared by its own unit's leaders alone", () => {
    const unit = { ...health, troop: "1", type: "avdelning" } as const

    expect(canShare(unit, [{ kind: "leader", unitNumber: 1 }], "1100101")).toBe(true)
    expect(canShare(unit, [{ kind: "leader", unitNumber: 2 }], "1100201")).toBe(false)
  })

  it("refuses someone outside the type's role, such as a management member on a health case", () => {
    expect(canShare(health, [{ kind: "cmt" }], "1200401")).toBe(false)
    expect(canShare(health, [{ kind: "healthGrant" }], "1200002")).toBe(false)
  })

  it("refuses a closed case, and a level 4 case to anyone", () => {
    expect(canShare({ ...health, isClosed: true }, healthTeam, "1200001")).toBe(false)
    expect(canShare({ ...health, secrecyLevel: 4 }, healthTeam, "1200001")).toBe(false)
  })

  it("lets only the creator share a private case", () => {
    const secret = { ...health, secrecyLevel: 5 } as const

    expect(canShare(secret, healthTeam, "1200001")).toBe(true)
    expect(canShare(secret, healthTeam, "1200009")).toBe(false)
  })
})
