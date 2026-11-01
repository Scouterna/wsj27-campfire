import { describe, expect, it } from "vitest"

import { coverRect } from "./cover"

const square = { height: 1080, width: 1080 }
const portrait = { height: 1350, width: 1080 }

describe("covering a frame with a photo", () => {
  it("crops the sides of a wide photo, centered", () => {
    // A 16:9 photo in a square frame: the height decides, and the surplus width is
    // shared evenly so the middle of the photo stays in the middle of the frame.
    const rect = coverRect({ height: 900, width: 1600 }, square)

    expect(rect.height).toBe(1080)
    expect(rect.width).toBe(1920)
    expect(rect.y).toBe(0)
    expect(rect.x).toBe(-420)
  })

  it("crops the top and bottom of a tall photo, centered", () => {
    const rect = coverRect({ height: 1600, width: 900 }, square)

    expect(rect.width).toBe(1080)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(-420)
  })

  it("leaves a photo of the frame's own shape alone", () => {
    expect(coverRect({ height: 2160, width: 2160 }, square)).toEqual({
      height: 1080,
      width: 1080,
      x: 0,
      y: 0,
    })
  })

  it("fills a standing frame from a wide photo", () => {
    const rect = coverRect({ height: 900, width: 1600 }, portrait)

    // The frame is taller than the photo's shape, so the height decides and a great deal
    // of the width goes – which is what the preview has to show too, or the file would
    // not be what was chosen.
    expect(rect.height).toBe(1350)
    expect(rect.width).toBe(2400)
    expect(rect.x).toBe(-660)
  })

  it("never draws the photo smaller than the frame", () => {
    // A photo smaller than the export size is scaled up rather than laid in the middle
    // with paper around it: a frame with a hole in it is not an image anybody wants.
    const rect = coverRect({ height: 200, width: 200 }, square)

    expect(rect.width).toBeGreaterThanOrEqual(1080)
    expect(rect.height).toBeGreaterThanOrEqual(1080)
    expect(rect.x).toBeLessThanOrEqual(0)
    expect(rect.y).toBeLessThanOrEqual(0)
  })
})
