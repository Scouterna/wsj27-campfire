import { describe, expect, it } from "vitest"

import type { TextSlot } from "./Frame"
import { fitSize, lineHeight, linesOf } from "./text"

const picture = { height: 1000, width: 1000 }

// A wide, low slot that tops out at 50 pixels.
const strip: TextSlot = {
  angle: 0,
  box: { height: 0.1, width: 0.5, x: 0.25, y: 0.45 },
  id: "strip",
  isMovable: false,
  isMultiline: false,
  label: "Rad",
  maxSize: 0.05,
}

const block: TextSlot = { ...strip, box: { ...strip.box, height: 0.2 }, isMultiline: true }

// Every character half as wide as the size, so a line's width is easy to reason about.
const measure = (line: string, size: number): number => (line.length * size) / 2

describe("the lines a text is set in", () => {
  it("draws nothing for a slot left empty or blank", () => {
    expect(linesOf("", strip)).toEqual([])
    expect(linesOf("  \n ", block)).toEqual([])
  })

  it("keeps a strip to one line, whatever was typed", () => {
    expect(linesOf(" Hej\nhopp ", strip)).toEqual(["Hej\nhopp"])
  })

  it("splits a block at its returns, keeping the blank lines a return opens", () => {
    expect(linesOf("Hej\r\nhopp", block)).toEqual(["Hej", "hopp"])
    expect(linesOf("Hej\n", block)).toEqual(["Hej", ""])
  })
})

describe("the size a text is set at", () => {
  it("stops at the slot's ceiling for a short word", () => {
    expect(fitSize(["Hej"], strip, picture, measure)).toBe(50)
  })

  it("shrinks a long line until it fits the width", () => {
    // 40 characters at 50 pixels is 1000 wide; the slot is 500, so half the size.
    const size = fitSize(["x".repeat(40)], strip, picture, measure)

    expect(size).toBe(25)
    expect(measure("x".repeat(40), size)).toBe(500)
  })

  it("lets the widest line decide", () => {
    expect(fitSize(["kort", "x".repeat(40)], block, picture, measure)).toBe(25)
  })

  it("shrinks a tall block until every line fits the height", () => {
    const lines = ["a", "b", "c", "d", "e"]
    const size = fitSize(lines, block, picture, measure)

    expect(size * lineHeight * lines.length).toBeCloseTo(200)
  })
})
