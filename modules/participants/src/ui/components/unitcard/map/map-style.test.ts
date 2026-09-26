import { describe, expect, it } from "vitest"

import type { Spot } from "./geography"
import { spotsData, unitMapStyle, type MapPalette } from "./map-style"

const palette: MapPalette = {
  border: "rgba(0, 0, 0, 1)",
  green: "rgba(0, 0, 0, 1)",
  halo: "rgba(0, 0, 0, 1)",
  label: "rgba(0, 0, 0, 1)",
  land: "rgba(0, 0, 0, 1)",
  road: "rgba(0, 0, 0, 1)",
  roadCasing: "rgba(0, 0, 0, 1)",
  spot: "rgba(0, 0, 0, 1)",
  urban: "rgba(0, 0, 0, 1)",
  water: "rgba(0, 0, 0, 1)",
}

const spots: readonly Spot[] = [
  { count: 4, latitude: 57.7, longitude: 11.97, name: "Göteborg" },
  { count: 1, latitude: 57.66, longitude: 12.01, name: "Mölndal" },
]

describe("the unit map's style", () => {
  for (const isOpen of [false, true]) {
    const style = unitMapStyle(palette, spots, isOpen)
    const state = isOpen ? "open" : "as a backdrop"

    it(`names places only on the open map, ${state}`, () => {
      const names = style.layers.filter((layer) => layer.type === "symbol")

      expect(names).not.toEqual([])
      for (const layer of names) {
        expect(layer.layout?.visibility).toBe(isOpen ? "visible" : "none")
      }
    })

    it(`draws no text from the unit's own spots, ${state}`, () => {
      const sources = style.layers.flatMap((layer) =>
        layer.type === "symbol" ? [layer.source] : [],
      )

      expect(sources).not.toContain("spots")
    })

    it(`reaches no host but the tile service, ${state}`, () => {
      const hosts = Object.values(style.sources).flatMap((source) =>
        "url" in source ? [new URL(source.url).host] : [],
      )

      expect(hosts).toEqual(["tiles.openfreemap.org"])
      expect(new URL(style.glyphs ?? "").host).toBe("tiles.openfreemap.org")
    })

    it(`credits GeoNames beside OpenFreeMap and OpenStreetMap, ${state}`, () => {
      const credits = Object.values(style.sources)
        .map((source) => ("attribution" in source ? source.attribution : ""))
        .join(" ")

      expect(credits).toContain("GeoNames")
      expect(credits).toContain("OpenFreeMap")
      expect(credits).toContain("OpenStreetMap")
    })
  }
})

/**
 * The radius each spot is drawn at.
 * @param isOpen Whether the map is open.
 * @returns The radii, in the spots' order.
 */
function radii(isOpen: boolean): unknown[] {
  return spotsData(spots, isOpen).features.map(
    (feature) => (feature.properties as { readonly radius?: number } | null)?.radius,
  )
}

describe("the spots as the map's data", () => {
  it("draws one point per spot, and carries nothing that names a place", () => {
    const data = spotsData(spots, true)

    expect(data.features).toHaveLength(2)
    expect(JSON.stringify(data)).not.toContain("Göteborg")
  })

  it("draws every spot the same size, whatever its head count, a little larger when open", () => {
    const [open] = radii(true)
    const [backdrop] = radii(false)

    expect(new Set(radii(true)).size).toBe(1)
    expect(new Set(radii(false)).size).toBe(1)
    expect(open).toBeGreaterThan(backdrop as number)
  })
})
