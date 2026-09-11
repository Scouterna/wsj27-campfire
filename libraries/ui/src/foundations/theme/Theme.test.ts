import { describe, expect, it } from "vitest"

import { isTheme, themes } from "../../index"

describe("isTheme", () => {
  it("accepts every name the design system draws", () => {
    for (const theme of themes) {
      expect(isTheme(theme)).toBe(true)
    }
  })

  it("refuses a name the design system has no colors for", () => {
    expect(isTheme("purple")).toBe(false)
  })

  it("refuses a value that is not a string", () => {
    expect(isTheme(undefined)).toBe(false)
  })
})
