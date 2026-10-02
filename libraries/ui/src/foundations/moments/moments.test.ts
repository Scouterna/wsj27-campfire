import { describe, expect, it } from "vitest"

import { formatRowMoment, formatTimelineMoment } from "./moments"

// Local times, so the tests read the same in every time zone they run in.
const now = new Date(2027, 7, 5, 9, 30)

describe("writing a moment for a list row", () => {
  it("says only the time today", () => {
    expect(formatRowMoment(new Date(2027, 7, 5, 6, 52), now)).toBe("06:52")
  })

  it("says igår and the time yesterday, even less than a day ago", () => {
    expect(formatRowMoment(new Date(2027, 7, 4, 23, 5), now)).toBe("igår 23:05")
  })

  it("says the day and the month without a period before that", () => {
    expect(formatRowMoment(new Date(2027, 6, 20, 14, 5), now)).toBe("20 juli")
    expect(formatRowMoment(new Date(2027, 7, 1, 14, 5), now)).toBe("1 aug")
  })
})

describe("writing a moment for the timeline", () => {
  it("says idag or igår with the time", () => {
    expect(formatTimelineMoment(new Date(2027, 7, 5, 8, 15), now)).toBe("idag 08:15")
    expect(formatTimelineMoment(new Date(2027, 7, 4, 9, 15), now)).toBe("igår 09:15")
  })

  it("says the day, the month, and the time before that", () => {
    expect(formatTimelineMoment(new Date(2027, 7, 1, 16, 40), now)).toBe("1 aug 16:40")
  })
})
