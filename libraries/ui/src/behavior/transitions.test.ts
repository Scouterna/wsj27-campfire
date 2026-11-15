import { afterEach, describe, expect, it, vi } from "vitest"

import { expectPop, expectPush, wasPopExpected, wasPushExpected } from "./transitions"

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

describe("whether a push had its direction declared", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads false when nothing declared the push", () => {
    expect(wasPushExpected()).toBe(false)
  })

  it("sets the direction, and consumes the mark exactly once", () => {
    // The tests run without a DOM, and the direction is only an attribute on the root.
    const dataset: Record<string, string> = {}
    vi.stubGlobal("document", { documentElement: { dataset } })
    expectPush("fade")
    expect(dataset["nav"]).toBe("fade")
    expect(wasPushExpected()).toBe(true)
    expect(wasPushExpected()).toBe(false)
  })
})
