import { describe, expect, it } from "vitest"

import { replyTime } from "./asking"

describe("replyTime", () => {
  it("promises days at home, and hours from the first departure to the last homecoming", () => {
    expect(replyTime(new Date("2026-11-10T12:00:00+01:00"))).toBe(
      "Du får svar inom fyra dagar. Under resan och lägret får du svar inom fyra timmar.",
    )
    expect(replyTime(new Date("2027-07-21T00:00:00+02:00"))).toContain("inom fyra timmar")
    expect(replyTime(new Date("2027-08-10T23:59:00+02:00"))).toContain("inom fyra timmar")
    expect(replyTime(new Date("2027-08-11T00:00:00+02:00"))).toBe("Du får svar inom fyra dagar.")
  })
})
