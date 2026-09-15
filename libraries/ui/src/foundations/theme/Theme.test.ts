import { describe, expect, it } from "vitest"

import { isTheme, themeFromSearch, themes } from "../../index"

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

describe("themeFromSearch", () => {
  it("reads every name the design system draws", () => {
    for (const theme of themes) {
      expect(themeFromSearch(`?theme=${theme}`)).toBe(theme)
    }
  })

  it("reads a name without the leading question mark", () => {
    expect(themeFromSearch("theme=brown")).toBe("brown")
  })

  it("reads the name from among other parameters", () => {
    expect(themeFromSearch("?unit=12&theme=green")).toBe("green")
  })

  it("answers nothing when the address asks for no theme", () => {
    expect(themeFromSearch("")).toBeUndefined()
    expect(themeFromSearch("?unit=12")).toBeUndefined()
  })

  it("answers nothing when the address asks for a color the design system has none of", () => {
    expect(themeFromSearch("?theme=purple")).toBeUndefined()
    expect(themeFromSearch("?theme=")).toBeUndefined()
    expect(themeFromSearch("?theme=%20blue")).toBeUndefined()
  })
})
