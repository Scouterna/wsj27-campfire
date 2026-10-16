import { describe, expect, it } from "vitest"

import { fitWithin, jpegName } from "./shrink-picture"

describe("fitting a picture in a box", () => {
  it("shrinks the longer side to the box, keeping the shape", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual([2048, 1536])
    expect(fitWithin(3024, 4032, 2048)).toEqual([1536, 2048])
  })

  it("never grows a picture that already fits", () => {
    expect(fitWithin(800, 600, 2048)).toEqual([800, 600])
  })

  it("keeps a sliver at least a pixel wide", () => {
    expect(fitWithin(100_000, 10, 2048)).toEqual([2048, 1])
  })
})

describe("naming a picture once it is a JPEG", () => {
  it("swaps its extension for a JPEG's", () => {
    expect(jpegName("IMG_2041.HEIC")).toBe("IMG_2041.jpg")
    expect(jpegName("utslag.arm.png")).toBe("utslag.arm.jpg")
  })

  it("names one it has nothing to keep of", () => {
    expect(jpegName("")).toBe("bild.jpg")
    expect(jpegName(".png")).toBe("bild.jpg")
    expect(jpegName("utslag")).toBe("utslag.jpg")
  })
})
