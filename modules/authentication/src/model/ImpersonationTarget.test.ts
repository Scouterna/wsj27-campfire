import { describe, expect, it } from "vitest"

import { isMatch, type ImpersonationTarget } from "./ImpersonationTarget"

const åsa: ImpersonationTarget = {
  firstName: "Åsa",
  memberNo: "1100201",
  name: "Åsa Öberg",
  roles: [{ kind: "leader", unitNumber: 2 }],
  unit: { number: 2 },
}

describe("isMatch", () => {
  it("matches everybody while the search is empty or only spaces", () => {
    expect(isMatch(åsa, "")).toBe(true)
    expect(isMatch(åsa, " ".repeat(3))).toBe(true)
  })

  it("finds the text anywhere in the name, whatever its case", () => {
    expect(isMatch(åsa, "ÖBER")).toBe(true)
    expect(isMatch(åsa, "  åsa ")).toBe(true)
  })

  it("tells the Swedish letters apart from the ones they resemble", () => {
    expect(isMatch(åsa, "Asa")).toBe(false)
    expect(isMatch(åsa, "Oberg")).toBe(false)
  })
})
