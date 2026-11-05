import { describe, expect, it } from "vitest"

import { genderCount } from "./Gender"

describe("counting a gender in words", () => {
  it("inflects the noun for the count", () => {
    expect(genderCount("kvinna", 1)).toBe("1 kvinna")
    expect(genderCount("kvinna", 2)).toBe("2 kvinnor")
    expect(genderCount("man", 1)).toBe("1 man")
    expect(genderCount("man", 3)).toBe("3 män")
  })

  it("says annat and okänt as a kind of kön", () => {
    expect(genderCount("annat", 2)).toBe("2 med annat kön")
    expect(genderCount("okant", 1)).toBe("1 med okänt kön")
  })
})
