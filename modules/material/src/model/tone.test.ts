import { describe, expect, it } from "vitest"

import { isDrawnWhite } from "./tone"

describe("whether a file is drawn in white", () => {
  it.each([
    [["avdelningsikoner", "Icke-färgade (vita)", "Pixelfiler (PNG)"]],
    [["Logotyper", "Vit"]],
    [["Icke-färgad"]],
  ])("is white under %j", (trail) => {
    expect(isDrawnWhite(trail)).toBe(true)
  })

  it.each([[["avdelningsikoner", "Färgade"]], [["Aktiviteter"]], [["Avvita"]], [[]]])(
    "is in color under %j",
    (trail) => {
      expect(isDrawnWhite(trail)).toBe(false)
    },
  )
})
