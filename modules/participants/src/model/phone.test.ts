import { describe, expect, it } from "vitest"

import { dialablePhoneNumber, formatPhoneNumber } from "./phone"

describe("formatting a phone number for display", () => {
  it("formats a Swedish mobile number in the conventional grouping", () => {
    expect(formatPhoneNumber("+46708277486")).toBe("070-827 74 86")
    expect(formatPhoneNumber("0708277486")).toBe("070-827 74 86")
  })

  it("reads a number the same whatever shape it arrived in", () => {
    // The three spellings of one number all land on the one display shape.
    expect(formatPhoneNumber("070-8277486")).toBe("070-827 74 86")
    expect(formatPhoneNumber("070-827 74 86")).toBe("070-827 74 86")
    expect(formatPhoneNumber("0046 70 827 74 86")).toBe("070-827 74 86")
  })

  it("folds the country code away from a landline without guessing its grouping", () => {
    // Area codes vary in length, so a wrong grouping reads worse than none.
    expect(formatPhoneNumber("+4681234567")).toBe("081234567")
  })

  it("leaves a foreign number exactly as it arrived, in both spellings", () => {
    expect(formatPhoneNumber("+48123456789")).toBe("+48123456789")
    expect(formatPhoneNumber("0045 12 34 56 78")).toBe("0045 12 34 56 78")
  })

  it("leaves something that is not a number exactly as it arrived", () => {
    expect(formatPhoneNumber("växel, be om Karin")).toBe("växel, be om Karin")
  })
})

describe("making a phone number dialable", () => {
  it("drops the separators a display shape carries", () => {
    expect(dialablePhoneNumber("070-827 74 86")).toBe("0708277486")
  })

  it("keeps a country code for the dialer", () => {
    expect(dialablePhoneNumber("+46 70 827 74 86")).toBe("+46708277486")
  })
})
