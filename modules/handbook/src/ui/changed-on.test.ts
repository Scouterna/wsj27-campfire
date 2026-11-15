import { describe, expect, it } from "vitest"

import { changedOn } from "./changed-on"

describe("changedOn", () => {
  const now = new Date("2026-11-11T12:00:00.000Z")

  it("says a day this year by its day and month", () => {
    expect(changedOn("2026-09-23T07:35:27.912Z", now)).toBe("23 september")
  })

  it("adds the year to a day from another", () => {
    expect(changedOn("2025-12-15T10:00:00.000Z", now)).toBe("15 december 2025")
  })

  it("reads the year in Swedish time, where New Year's Eve has already turned", () => {
    expect(changedOn("2025-12-31T23:30:00.000Z", now)).toBe("1 januari")
  })
})
