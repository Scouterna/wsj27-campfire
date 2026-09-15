import { describe, expect, it } from "vitest"

import { cmtTheme, istTheme, unitTheme } from "../../index"

describe("unitTheme", () => {
  it("answers the color a unit works in", () => {
    expect(unitTheme(1)).toBe("yellow")
    expect(unitTheme(2)).toBe("green")
  })

  it("answers the color of the last unit in the directory", () => {
    expect(unitTheme(53)).toBe("red")
  })

  it("falls back to the contingent's blue for a unit the table does not know", () => {
    expect(unitTheme(0)).toBe("blue")
    expect(unitTheme(54)).toBe("blue")
    expect(unitTheme(999)).toBe("blue")
  })
})

describe("cmtTheme and istTheme", () => {
  it("are red", () => {
    expect(cmtTheme).toBe("red")
    expect(istTheme).toBe("red")
  })
})
