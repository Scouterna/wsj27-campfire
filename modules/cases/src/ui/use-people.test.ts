import type { Role } from "@scouterna/wsj27-campfire-utils"
import { describe, expect, it } from "vitest"

import { leaderUnits, ownUnitOf, reachOf } from "./use-people"

const leaderOfOne: readonly Role[] = [{ kind: "leader", unitNumber: 1 }]
const leaderOfTwo: readonly Role[] = [
  { kind: "leader", unitNumber: 1 },
  { kind: "leader", unitNumber: 2 },
]
const management: readonly Role[] = [{ kind: "cmt" }, { kind: "health" }]

describe("reading the reader's reach from their roles", () => {
  it("lists the units a leader leads, each once and in order", () => {
    expect(leaderUnits(leaderOfTwo)).toEqual([1, 2])
    expect(leaderUnits([...leaderOfTwo, { kind: "leader", unitNumber: 1 }])).toEqual([1, 2])
    expect(leaderUnits(management)).toEqual([])
  })

  it("reaches the whole contingent for the management, and a leader's own units", () => {
    expect(reachOf(management)).toEqual({ kind: "contingent" })
    expect(reachOf(leaderOfTwo)).toEqual({ kind: "units", unitNumbers: [1, 2] })
  })

  it("leaves a unit unnamed only for a leader of exactly one", () => {
    expect(ownUnitOf(leaderOfOne)).toBe(1)
    expect(ownUnitOf(leaderOfTwo)).toBeUndefined()
    expect(ownUnitOf(management)).toBeUndefined()
    expect(ownUnitOf([{ kind: "leader" }])).toBeUndefined()
  })
})
