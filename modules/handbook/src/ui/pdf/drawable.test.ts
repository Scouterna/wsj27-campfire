import { describe, expect, it } from "vitest"

import { drawable } from "./drawable"

describe("drawable", () => {
  it("keeps what the body face draws: Swedish letters, dashes, and quotation marks", () => {
    const text = "Vi åker – “hem” – för 50 €, ½ dag … Ö é ü ø"
    expect(drawable(text)).toBe(text)
  })

  it("swaps a letter the face lacks for the closest it has", () => {
    expect(drawable("Gdańsk vid Wisła, Łódź och Čapek")).toBe("Gdansk vid Wisla, Lódz och Capek")
  })

  it("writes an arrow in plain marks and leaves out what has nothing close", () => {
    expect(drawable("Hem → läger ✓ 😀 klart")).toBe("Hem -> läger   klart")
  })

  it("keeps a line break", () => {
    expect(drawable("ett\ntvå")).toBe("ett\ntvå")
  })
})
