import { describe, expect, it } from "vitest"

import { canReadUnitHealth, type Viewer } from "./viewer"

const leader: Viewer = {
  memberNo: "1100101",
  readsEveryone: false,
  readsHealth: false,
  unitNumber: 1,
}

const healthTeam: Viewer = { memberNo: "1200001", readsEveryone: true, readsHealth: true }

describe("who may read a unit's health answers", () => {
  it("lets a leader read their own unit and no other", () => {
    expect(canReadUnitHealth(leader, 1)).toBe(true)
    expect(canReadUnitHealth(leader, 2)).toBe(false)
  })

  it("lets the health team read every unit", () => {
    expect(canReadUnitHealth(healthTeam, 1)).toBe(true)
    expect(canReadUnitHealth(healthTeam, 7)).toBe(true)
  })

  it("refuses the management without a health grant", () => {
    expect(canReadUnitHealth({ ...healthTeam, readsHealth: false }, 1)).toBe(false)
  })

  it("opens nothing beyond a leader's own unit for a grant without the management", () => {
    expect(canReadUnitHealth({ ...leader, readsHealth: true }, 2)).toBe(false)
    expect(canReadUnitHealth({ ...healthTeam, readsEveryone: false }, 1)).toBe(false)
  })

  it("lets a leader on the health team read every unit", () => {
    expect(canReadUnitHealth({ ...healthTeam, unitNumber: 1 }, 2)).toBe(true)
  })
})
