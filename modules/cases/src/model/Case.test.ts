import { describe, expect, it } from "vitest"

import { aboutName, type Case } from "./Case"

const opened = {
  createdAt: new Date(2027, 7, 1),
  creatorMemberNo: "1200001",
  id: "1",
  isClosed: false,
  title: "Feber",
  troop: "1",
} as const

describe("naming who a case is about", () => {
  it("names the person the case is about", () => {
    const item: Case = { ...opened, aboutMemberNo: "1100101" }
    const people = new Map([["1100101", { memberNo: "1100101", name: "Lars Lindberg" }]])
    expect(aboutName(item, people)).toBe("Lars Lindberg")
  })

  it("says so for a case about nobody in particular", () => {
    expect(aboutName(opened, undefined)).toBe("Ingen person angiven")
  })
})
