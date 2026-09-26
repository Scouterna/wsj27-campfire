import { describe, expect, it } from "vitest"

import { placeTowns } from "./geography"
import { packedPlaces } from "./places"

describe("placing a unit's home towns", () => {
  it("folds the case and the spaces a town was typed in onto its postort", () => {
    const spots = placeTowns(["GÖTEBORG ", " göteborg", "Västra  Frölunda"])

    expect(spots.map((spot) => [spot.name, spot.count])).toEqual([
      ["Göteborg", 2],
      ["Västra Frölunda", 1],
    ])
  })

  it("puts the most populous town first", () => {
    const spots = placeTowns(["Lerum", "Mölndal", "Mölndal", "Alingsås", "Mölndal", "Lerum"])

    expect(spots.map((spot) => spot.count)).toEqual([3, 2, 1])
    expect(spots.at(0)?.name).toBe("Mölndal")
  })

  it("leaves out a town it cannot place, a missing one, and a blank one", () => {
    const spots = placeTowns(["Bryssel (Belgien)", "Sthlm", undefined, " ", "Umeå"])

    expect(spots.map((spot) => spot.name)).toEqual(["Umeå"])
  })

  it("places nothing for a unit nobody's town is known for", () => {
    expect(placeTowns([undefined, undefined])).toEqual([])
  })

  it("places the postort GeoNames spells with a Â", () => {
    expect(placeTowns(["Ålandsbro"]).map((spot) => spot.name)).toEqual(["Ålandsbro"])
  })

  it("places Älvsjö in Älvsjö, not where GeoNames' misspelled row put it", () => {
    const [alvsjo] = placeTowns(["Älvsjö"])

    expect(alvsjo?.latitude).toBeCloseTo(59.28, 1)
  })

  it("holds every postort once, so no town is placed by a row that loses to another", () => {
    const names = packedPlaces
      .split(";")
      .map((row) => row.split(",", 1).at(0)?.toLocaleLowerCase("sv"))

    expect(new Set(names).size).toBe(names.length)
    expect(names.filter((name) => name?.startsWith("â"))).toEqual([])
  })

  it("places a town where Sweden is", () => {
    const [kiruna] = placeTowns(["Kiruna"])

    expect(kiruna?.latitude).toBeCloseTo(67.86, 0)
    expect(kiruna?.longitude).toBeCloseTo(20.23, 0)
  })
})
