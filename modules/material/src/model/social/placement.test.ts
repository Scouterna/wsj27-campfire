import { describe, expect, it } from "vitest"

import { exportSize, type TextSlot } from "./Frame"
import {
  addedPlacement,
  cornerOf,
  initialPlacement,
  isOnText,
  maxSize,
  minSize,
  moveBy,
  normalized,
  resized,
  turned,
} from "./placement"

const slot: TextSlot = {
  angle: -5,
  box: { height: 0.2, width: 0.6, x: 0.2, y: 0.3 },
  id: "mitten",
  isMovable: true,
  isMultiline: true,
  label: "Text",
  maxSize: 0.09,
}

const start = { angle: 0, x: 0.5, y: 0.5 }

describe("where movable text starts", () => {
  it("sits in the middle of its slot, at its turn, fitted", () => {
    expect(initialPlacement(slot)).toEqual({ angle: -5, x: 0.5, y: 0.4 })
  })
})

describe("dragging text", () => {
  it("moves it by the distance dragged, in the picture's shares", () => {
    const moved = moveBy(start, { x: exportSize.width / 10, y: -exportSize.height / 4 })

    expect(moved.x).toBeCloseTo(0.6)
    expect(moved.y).toBeCloseTo(0.25)
  })

  it("keeps its middle on the picture", () => {
    expect(moveBy(start, { x: 5000, y: -5000 })).toMatchObject({ x: 1, y: 0 })
  })
})

describe("an angle as it is shown", () => {
  it("stays within half a turn either way", () => {
    expect(normalized(190)).toBe(-170)
    expect(normalized(-190)).toBe(170)
    expect(normalized(45)).toBe(45)
  })
})

describe("a press on placed text", () => {
  const extent = { height: 100, width: 400 }
  const center = { x: exportSize.width / 2, y: exportSize.height / 2 }

  it("lands on it inside its box, and not outside", () => {
    const placed = { angle: 0, x: 0.5, y: 0.5 }
    expect(isOnText(placed, extent, { x: center.x + 190, y: center.y + 40 })).toBe(true)
    expect(isOnText(placed, extent, { x: center.x + 210, y: center.y })).toBe(false)
    expect(isOnText(placed, extent, { x: center.x, y: center.y + 60 })).toBe(false)
  })

  it("follows the box when the text is turned", () => {
    const turned = { angle: 90, x: 0.5, y: 0.5 }
    expect(isOnText(turned, extent, { x: center.x, y: center.y + 190 })).toBe(true)
    expect(isOnText(turned, extent, { x: center.x + 190, y: center.y })).toBe(false)
  })
})

describe("where an added text starts", () => {
  it("starts where the slot starts its text, a little lower for each one already there", () => {
    expect(addedPlacement(slot, 0)).toEqual(initialPlacement(slot))
    expect(addedPlacement(slot, 2).y).toBeCloseTo(initialPlacement(slot).y + 0.28)
  })

  it("stays on the picture however many there are", () => {
    expect(addedPlacement(slot, 50).y).toBeCloseTo(0.95)
  })
})

describe("a corner of placed text", () => {
  const extent = { height: 100, width: 400 }

  it("sits half the box away from the middle, as shares of the picture", () => {
    const corner = cornerOf({ angle: 0, x: 0.5, y: 0.5 }, extent, { x: 1, y: 1 })
    expect(corner.x).toBeCloseTo(0.5 + 200 / exportSize.width)
    expect(corner.y).toBeCloseTo(0.5 + 50 / exportSize.height)
  })

  it("turns with the text", () => {
    const corner = cornerOf({ angle: 90, x: 0.5, y: 0.5 }, extent, { x: 1, y: -1 })
    expect(corner.x).toBeCloseTo(0.5 + 50 / exportSize.width)
    expect(corner.y).toBeCloseTo(0.5 + 200 / exportSize.height)
  })
})

describe("a quarter turn", () => {
  it("turns straight text a quarter either way", () => {
    expect(turned({ angle: 0, x: 0.5, y: 0.5 }, 1).angle).toBe(90)
    expect(turned({ angle: 0, x: 0.5, y: 0.5 }, -1).angle).toBe(-90)
  })

  it("comes back round past half a turn", () => {
    expect(turned({ angle: 180, x: 0.5, y: 0.5 }, 1).angle).toBe(-90)
  })

  it("straightens a slanted slot's text onto the nearest quarter", () => {
    expect(turned({ angle: -5, x: 0.5, y: 0.5 }, 1).angle).toBe(90)
  })
})

describe("sizing text a step", () => {
  it("grows and shrinks it from the size it is drawn at", () => {
    expect(resized({ angle: 0, x: 0.5, y: 0.5 }, 0.1, 1.2).size).toBeCloseTo(0.12)
  })

  it("keeps it within what a reader may choose", () => {
    expect(resized({ angle: 0, x: 0.5, y: 0.5 }, 0.2, 2).size).toBe(maxSize)
    expect(resized({ angle: 0, x: 0.5, y: 0.5 }, 0.03, 0.5).size).toBe(minSize)
  })
})
