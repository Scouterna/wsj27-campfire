import { describe, expect, it } from "vitest"

import { matchingUnits } from "./unit-search"

const names = new Map([
  [1, "Björnen"],
  [11, "Ugglan"],
  [12, "Björktrasten"],
])

/**
 * The units a search names among those three.
 * @param needle What the reader typed, trimmed and lower-cased.
 * @returns The units.
 */
function search(needle: string): readonly number[] {
  return matchingUnits([1, 11, 12], needle, (unit) => names.get(unit))
}

describe("searching for a unit", () => {
  it("finds a unit by its exact number alone, never one the number begins", () => {
    expect(search("1")).toEqual([1])
    expect(search("11")).toEqual([11])
    expect(search("2")).toEqual([])
  })

  it("finds a unit by its number spelled out", () => {
    expect(search("avd 11")).toEqual([11])
    expect(search("avdelning 1")).toEqual([1])
  })

  it("finds every unit whose name holds the search", () => {
    expect(search("björ")).toEqual([1, 12])
    expect(search("ugglan")).toEqual([11])
  })

  it("finds nothing while nothing is typed", () => {
    expect(search("")).toEqual([])
  })
})
