import { describe, expect, it } from "vitest"

import { istPatrolNumbered } from "./IstPatrol"

describe("an IST patrol by its number", () => {
  it("names a patrol the contingent names", () => {
    expect(istPatrolNumbered(7)).toEqual({ name: "Tordyvel", number: 7 })
  })

  it("leaves a number the contingent has not named without a name", () => {
    expect(istPatrolNumbered(99)).toEqual({ number: 99 })
  })
})
