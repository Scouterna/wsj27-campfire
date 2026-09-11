import { describe, expect, it } from "vitest"

import { stringOrFallback } from "./string"

describe("reading a value that ought to be a string", () => {
  it("takes a string as it is", () => {
    expect(stringOrFallback("Melker")).toBe("Melker")
  })

  it("answers with the empty string when there was nothing", () => {
    expect(stringOrFallback(undefined)).toBe("")
    // eslint-disable-next-line unicorn/no-null -- JSON carries null, so the parser must survive it
    expect(stringOrFallback(null)).toBe("")
  })

  it("answers with the empty string when the value was some other type", () => {
    // The case that matters: a JSON body whose field changed type under us.
    expect(stringOrFallback(7)).toBe("")
    expect(stringOrFallback({ name: "Melker" })).toBe("")
    expect(stringOrFallback(["Melker"])).toBe("")
  })

  it("takes a caller's own fallback", () => {
    expect(stringOrFallback(undefined, "–")).toBe("–")
  })
})
