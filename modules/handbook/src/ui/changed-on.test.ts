import { describe, expect, it } from "vitest"

import { changedOn } from "./changed-on"

describe("changedOn", () => {
  it("names the day in Sweden, not in UTC", () => {
    expect(changedOn("2026-09-22T22:30:00.000Z")).toBe("23 september")
  })
})
