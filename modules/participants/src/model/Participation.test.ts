import { describe, expect, it } from "vitest"

import { funktionName, travelName } from "./Participation"

describe("naming a travel choice", () => {
  it("gives the Swedish label", () => {
    expect(travelName("rundresa")).toBe("Rundresa")
    expect(travelName("direktresa")).toBe("Direktresa")
    expect(travelName("egenResa")).toBe("Egen resa")
  })
})

describe("naming a CMT funktion", () => {
  it("gives the Swedish label", () => {
    expect(funktionName("administration")).toBe("Admin")
    expect(funktionName("program")).toBe("Program")
    expect(funktionName("halsosupport")).toBe("Hälsosupport")
    expect(funktionName("avdelningssupport")).toBe("Avdelningssupport")
    expect(funktionName("istSupport")).toBe("IST-support")
    expect(funktionName("kommunikation")).toBe("Kommunikation")
    expect(funktionName("kontingentledare")).toBe("HoC")
  })
})
