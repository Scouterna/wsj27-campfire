import { describe, expect, it } from "vitest"

import { expectPop, wasPopExpected } from "./transitions"

describe("whether a pop was asked for", () => {
  it("reads false when nothing marked the pop", () => {
    expect(wasPopExpected()).toBe(false)
  })

  it("consumes the mark exactly once, so a stale mark cannot arm the next pop", () => {
    expectPop()
    expect(wasPopExpected()).toBe(true)
    expect(wasPopExpected()).toBe(false)
  })
})
