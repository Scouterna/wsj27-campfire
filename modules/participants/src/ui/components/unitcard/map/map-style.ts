import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl"

import type { Spot } from "./geography"

/**
 * The map's colors, each an `rgba()` string MapLibre can parse – resolved from the unit
 * theme's tokens, so the map wears the unit's color like every other surface does.
 */
export interface MapPalette {
  readonly border: string
  readonly green: string
  readonly halo: string
  readonly label: string
  readonly land: string
  readonly road: string
  readonly roadCasing: string
  readonly spot: string
  readonly urban: string
  readonly water: string
}

// The custom property each color is read from, in UnitMap.css.
const tokens: Readonly<Record<keyof MapPalette, string>> = {
  border: "--unit-map-border",
  green: "--unit-map-green",
  halo: "--unit-map-halo",
  label: "--unit-map-label",
  land: "--unit-map-land",
  road: "--unit-map-road",
  roadCasing: "--unit-map-road-casing",
  spot: "--unit-map-spot",
  urban: "--unit-map-urban",
  water: "--unit-map-water",
}

/**
 * The palette as the element sees it. A custom property reads back as the text it was
 * declared with – `color-mix(…)` over other properties – and a computed `color` may come
 * back as `color(srgb …)`, neither of which MapLibre parses, so each is painted onto a
 * pixel and read back as plain numbers.
 * @param element Where in the tree to read the theme – inside the unit's theme wrapper.
 * @returns Every color, as `rgba()`.
 */
export function readPalette(element: HTMLElement): MapPalette {
  const probe = document.createElement("span")
  element.append(probe)
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })

  const resolve = (token: string): string => {
    probe.style.color = `var(${token})`
    const computed = getComputedStyle(probe).color
    if (context === null) {
      return computed
    }
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = computed
    context.fillRect(0, 0, 1, 1)
    const [red = 0, green = 0, blue = 0, alpha = 255] = context.getImageData(0, 0, 1, 1).data
    return `rgba(${String(red)}, ${String(green)}, ${String(blue)}, ${String(alpha / 255)})`
  }

  const palette = Object.fromEntries(
    Object.entries(tokens).map(([key, token]) => [key, resolve(token)]),
  ) as unknown as MapPalette
  probe.remove()
  return palette
}

/**
 * The spots as the map's own data – one point each, carrying the radius it is drawn at.
 * Every spot is the same size, a little larger on the open map; how many live there is
 * said by the count on it rather than by its size, since a dot only points a town out.
 * Nothing that names the place goes in, so a spot never says whose town it is.
 * @param spots Where the unit lives.
 * @param isOpen Whether the map is the card's content rather than its backdrop.
 * @returns The GeoJSON the spot layer draws.
 */
export function spotsData(spots: readonly Spot[], isOpen: boolean): GeoJSON.FeatureCollection {
  return {
    features: spots.map((spot) => ({
      geometry: { coordinates: [spot.longitude, spot.latitude], type: "Point" },
      properties: { radius: isOpen ? 6 : 4 },
      type: "Feature",
    })),
    type: "FeatureCollection",
  }
}

/**
 * The layers only an open map shows – the smaller roads, and the places' names.
 */
export const openLayers = ["road-minor", "places"] as const

const byZoom = (...stops: number[]): ExpressionSpecification => [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  ...stops,
]

/**
 * The names of the towns and cities, which only an open map shows.
 * @param palette The unit's colors.
 * @param isOpen Whether the map is the card's content.
 * @returns The layer.
 */
function placesLayer(palette: MapPalette, isOpen: boolean): LayerSpecification {
  return {
    // Villages only once the map is close enough to leave them room.
    filter: [
      "any",
      ["match", ["get", "class"], ["city", "town"], true, false],
      ["all", ["==", ["get", "class"], "village"], [">=", ["zoom"], 10]],
    ],
    id: "places",
    layout: {
      // In the place's own language, so a Swedish town reads as its own name.
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-radial-offset": 0.8,
      "text-size": ["match", ["get", "class"], "city", 13, "town", 12, 11],
      // Beside the place rather than on it, where a dot of the unit's may sit.
      "text-variable-anchor": ["top", "bottom", "left", "right"],
      visibility: isOpen ? "visible" : "none",
    },
    paint: {
      "text-color": palette.label,
      "text-halo-color": palette.halo,
      "text-halo-width": 1.5,
    },
    source: "openmaptiles",
    "source-layer": "place",
    type: "symbol",
  }
}

/**
 * The basemap, drawn in the unit's palette from OpenMapTiles' layers: land and water,
 * woods and towns, the roads, the borders, and the places' names – the smaller roads and
 * the names hidden where the map is a backdrop rather than the content.
 * @param palette The unit's colors.
 * @param isOpen Whether the map is the card's content, which shows the smaller roads and
 *   the names.
 * @returns The layers under the spots.
 */
function baseLayers(palette: MapPalette, isOpen: boolean): LayerSpecification[] {
  const minorRoads: LayerSpecification = {
    filter: ["match", ["get", "class"], ["secondary", "tertiary"], true, false],
    id: "road-minor",
    minzoom: 9,
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: isOpen ? "visible" : "none",
    },
    paint: { "line-color": palette.road, "line-width": byZoom(9, 0.5, 14, 4) },
    source: "openmaptiles",
    "source-layer": "transportation",
    type: "line",
  }
  const layers: LayerSpecification[] = [
    { id: "land", paint: { "background-color": palette.land }, type: "background" },
    {
      filter: ["match", ["get", "class"], ["wood", "grass"], true, false],
      id: "green",
      paint: { "fill-color": palette.green, "fill-opacity": 0.7 },
      source: "openmaptiles",
      "source-layer": "landcover",
      type: "fill",
    },
    {
      filter: ["match", ["get", "class"], ["residential", "suburb", "neighbourhood"], true, false],
      id: "urban",
      minzoom: 8,
      paint: { "fill-color": palette.urban },
      source: "openmaptiles",
      "source-layer": "landuse",
      type: "fill",
    },
    {
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      id: "water",
      paint: { "fill-color": palette.water },
      source: "openmaptiles",
      "source-layer": "water",
      type: "fill",
    },
    {
      id: "waterway",
      minzoom: 8,
      paint: { "line-color": palette.water, "line-width": byZoom(8, 0.5, 14, 3) },
      source: "openmaptiles",
      "source-layer": "waterway",
      type: "line",
    },
    minorRoads,
    {
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary"], true, false],
      id: "road-casing",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.roadCasing, "line-width": byZoom(5, 1, 14, 9) },
      source: "openmaptiles",
      "source-layer": "transportation",
      type: "line",
    },
    {
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary"], true, false],
      id: "road",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.road, "line-width": byZoom(5, 0.5, 14, 6) },
      source: "openmaptiles",
      "source-layer": "transportation",
      type: "line",
    },
    {
      filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
      id: "border",
      paint: {
        "line-color": palette.border,
        "line-dasharray": [3, 2],
        "line-width": byZoom(3, 0.8, 10, 1.5),
      },
      source: "openmaptiles",
      "source-layer": "boundary",
      type: "line",
    },
    placesLayer(palette, isOpen),
  ]

  return layers
}

/**
 * The whole style: the unit-colored basemap over OpenFreeMap's tiles and fonts, then the
 * spots from the unit's own data. The spots need nothing from the tile service, so they
 * are drawn whether or not a tile or a font ever arrives; only the names go without them.
 * @param palette The unit's colors.
 * @param spots Where the unit lives.
 * @param isOpen Whether the map is the card's content rather than its backdrop.
 * @returns The style to hand the map.
 */
export function unitMapStyle(
  palette: MapPalette,
  spots: readonly Spot[],
  isOpen: boolean,
): StyleSpecification {
  return {
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [
      ...baseLayers(palette, isOpen),
      {
        id: "spots",
        paint: {
          "circle-color": palette.spot,
          "circle-radius": ["get", "radius"],
          "circle-stroke-color": palette.halo,
          "circle-stroke-width": 1.5,
        },
        source: "spots",
        type: "circle",
      },
    ],
    sources: {
      openmaptiles: {
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
      spots: {
        // The postorter the spots are placed by are GeoNames' data, which asks for credit.
        attribution: '<a href="https://www.geonames.org">GeoNames</a>',
        data: spotsData(spots, isOpen),
        type: "geojson",
      },
    },
    version: 8,
  }
}
