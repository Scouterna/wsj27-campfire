import { describe, expect, it } from "vitest"

import type { Participant } from "../../../model/Participant"
import { letterStops, stopBudget, stopCount } from "./use-letter-jumps"

function person(firstName: string, memberNo: string): Participant {
  return { firstName, lastName: "", memberNo, role: "deltagare", unitNumber: 1 }
}

/**
 * A list of one person per given name, in the order given – the tests hand names
 * already collated, as `inReadingOrder` would leave them.
 */
function people(...names: readonly string[]): readonly Participant[] {
  return names.map((name, index) => person(name, String(index)))
}

describe("how many stops a screen has room for", () => {
  it("caps a tall screen at ten", () => {
    expect(stopBudget(1200)).toBe(10)
  })

  it("offers what fits on a shorter screen", () => {
    expect(stopBudget(600)).toBe(8)
  })

  it("never goes below three", () => {
    expect(stopBudget(200)).toBe(3)
  })
})

describe("how many stops a list is worth", () => {
  it("grows with the list on a square-root curve", () => {
    expect(stopCount(8, 10)).toBe(3)
    expect(stopCount(23, 10)).toBe(5)
    expect(stopCount(40, 10)).toBe(7)
  })

  it("never exceeds the screen's budget", () => {
    expect(stopCount(2600, 10)).toBe(10)
    expect(stopCount(2600, 5)).toBe(5)
  })

  it("offers at least two for the smallest list", () => {
    expect(stopCount(1, 10)).toBe(2)
  })
})

describe("the stops a list offers", () => {
  it("labels every stop as a range of the alphabet, whoever is present", () => {
    // Three ranges over the 29-letter alphabet: A–I, J–S, T–Ö.
    const stops = letterStops(people("Anna", "Erik", "Åsa"), 3)

    expect(stops).toEqual([
      { firstIndex: 0, label: "A–I" },
      { firstIndex: 2, label: "T–Ö" },
    ])
  })

  it("leaves out a range nobody files under, rather than offering a dead stop", () => {
    const stops = letterStops(people("Anna", "Bertil"), 3)

    expect(stops).toEqual([{ firstIndex: 0, label: "A–I" }])
  })

  it("keeps å, ä, and ö at the alphabet's end, and folds a foreign diacritic", () => {
    const stops = letterStops(people("Édith", "Åsa"), 3)

    // Édith files under E in the first range; Åsa under Å in the last.
    expect(stops).toEqual([
      { firstIndex: 0, label: "A–I" },
      { firstIndex: 1, label: "T–Ö" },
    ])
  })

  it("files a name outside the alphabet where the list begins", () => {
    const stops = letterStops(people("4H-Kalle", "Bertil"), 3)

    expect(stops).toEqual([{ firstIndex: 0, label: "A–I" }])
  })

  it("points each range at its first row", () => {
    const stops = letterStops(people("Anna", "Bo", "Cilla", "Johan", "Karin", "Tore", "Ulla"), 3)

    expect(stops).toEqual([
      { firstIndex: 0, label: "A–I" },
      { firstIndex: 3, label: "J–S" },
      { firstIndex: 5, label: "T–Ö" },
    ])
  })

  it("divides the whole alphabet at ten, ending in the Swedish letters", () => {
    const everywhere = people(
      "Anna",
      "Cilla",
      "Frida",
      "Ivar",
      "Lena",
      "Otto",
      "Rut",
      "Ulla",
      "Ylva",
      "Ärla",
    )
    const stops = letterStops(everywhere, 10)

    expect(stops.map((stop) => stop.label)).toEqual([
      "A–B",
      "C–E",
      "F–H",
      "I–K",
      "L–N",
      "O–Q",
      "R–T",
      "U–W",
      "X–Z",
      "Å–Ö",
    ])
  })

  it("offers nothing for an empty list, or a count of none", () => {
    expect(letterStops([], 10)).toEqual([])
    expect(letterStops(people("Anna"), 0)).toEqual([])
  })
})
