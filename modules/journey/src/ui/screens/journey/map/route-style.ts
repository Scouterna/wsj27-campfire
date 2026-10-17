import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl"

import type { Coordinates, RoutePoint } from "../../../../model/Itinerary"

/**
 * The map's colors, each an `rgba()` string MapLibre can parse, resolved from the theme's
 * tokens so the map wears the unit's color like every other surface.
 */
export interface RoutePalette {
  readonly ahead: string
  readonly border: string
  readonly green: string
  readonly halo: string
  readonly label: string
  readonly land: string
  readonly road: string
  readonly travelled: string
  readonly water: string
}

const tokens: Readonly<Record<keyof RoutePalette, string>> = {
  ahead: "--route-map-ahead",
  border: "--route-map-border",
  green: "--route-map-green",
  halo: "--route-map-halo",
  label: "--route-map-label",
  land: "--route-map-land",
  road: "--route-map-road",
  travelled: "--route-map-travelled",
  water: "--route-map-water",
}

/**
 * The palette as the element sees it. A custom property reads back as the text it was
 * declared with, which MapLibre cannot parse, so each is painted on a pixel and read back.
 * @param element Where in the tree to read the theme.
 * @returns Every color, as `rgba()`.
 */
export function readPalette(element: HTMLElement): RoutePalette {
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
  ) as unknown as RoutePalette
  probe.remove()
  return palette
}

/**
 * A line through points, as GeoJSON.
 * @param points The points, in order.
 * @returns The feature collection – empty with fewer than two points.
 */
export function lineData(points: readonly Coordinates[]): GeoJSON.FeatureCollection {
  return {
    features:
      points.length < 2
        ? []
        : [
            {
              geometry: {
                coordinates: points.map((point) => [point.longitude, point.latitude]),
                type: "LineString",
              },
              properties: {},
              type: "Feature",
            },
          ],
    type: "FeatureCollection",
  }
}

/**
 * The route split at the unit's position – the stretch behind it and the stretch ahead.
 * @param points The whole route.
 * @param at The moment.
 * @param position Where the unit is, which both stretches meet at.
 * @returns The two lines.
 */
export function splitRoute(
  points: readonly RoutePoint[],
  at: Date,
  position: Coordinates | undefined,
): { readonly ahead: GeoJSON.FeatureCollection; readonly travelled: GeoJSON.FeatureCollection } {
  const behind = points.filter((point) => point.at <= at)
  const coming = points.filter((point) => point.at > at)
  const here = position === undefined ? [] : [position]
  return { ahead: lineData([...here, ...coming]), travelled: lineData([...behind, ...here]) }
}

/**
 * The route's stops, as GeoJSON points – each place once, since a unit that comes home
 * the way it went passes the same terminal twice, and the visit ahead would otherwise be
 * drawn over the one behind.
 * @param points The route.
 * @param at The moment; a stop is behind the unit once any visit to it is.
 * @returns The stops.
 */
export function stopsData(points: readonly RoutePoint[], at: Date): GeoJSON.FeatureCollection {
  const stops = new Map<string, { readonly isBehind: boolean; readonly point: RoutePoint }>()
  for (const point of points) {
    const key = `${String(point.latitude)},${String(point.longitude)}`
    const isBehind = point.at <= at || stops.get(key)?.isBehind === true
    stops.set(key, { isBehind, point })
  }
  return {
    features: stops
      .values()
      .map(({ isBehind, point }) => ({
        geometry: { coordinates: [point.longitude, point.latitude], type: "Point" as const },
        properties: { isBehind },
        type: "Feature" as const,
      }))
      .toArray(),
    type: "FeatureCollection",
  }
}

const byZoom = (...stops: number[]): ExpressionSpecification => [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  ...stops,
]

/**
 * The basemap in the theme's palette from OpenMapTiles' layers – land, woods, water, the
 * big roads, the borders, and the cities' names.
 * @param palette The theme's colors.
 * @returns The layers under the route.
 */
function baseLayers(palette: RoutePalette): LayerSpecification[] {
  return [
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
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      id: "water",
      paint: { "fill-color": palette.water },
      source: "openmaptiles",
      "source-layer": "water",
      type: "fill",
    },
    {
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary"], true, false],
      id: "road",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.road, "line-width": byZoom(5, 0.6, 14, 6) },
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
    {
      filter: ["match", ["get", "class"], ["city", "town"], true, false],
      id: "places",
      layout: {
        // Swedish where the tiles know it, otherwise in the Latin alphabet, so Kaliningrad
        // is not spelled in Cyrillic to a Swedish reader.
        "text-field": ["coalesce", ["get", "name:sv"], ["get", "name:latin"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        // Beside the place rather than on it, where a stop of the route may sit.
        "text-radial-offset": 0.9,
        "text-size": ["match", ["get", "class"], "city", 13, 11],
        "text-variable-anchor": ["top", "bottom", "left", "right"],
      },
      paint: {
        "text-color": palette.label,
        "text-halo-color": palette.halo,
        "text-halo-width": 1.5,
      },
      source: "openmaptiles",
      "source-layer": "place",
      type: "symbol",
    },
  ]
}

/**
 * The whole style: the themed basemap over OpenFreeMap's tiles, then the route ahead
 * dashed, the route travelled solid, and the stops. The route needs nothing from the tile
 * service, so it is drawn whether or not a tile ever arrives.
 * @param palette The theme's colors.
 * @param points The route.
 * @param at The moment.
 * @param position Where the unit is.
 * @returns The style to hand the map.
 */
export function routeMapStyle(
  palette: RoutePalette,
  points: readonly RoutePoint[],
  at: Date,
  position: Coordinates | undefined,
): StyleSpecification {
  const { ahead, travelled } = splitRoute(points, at, position)
  return {
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [
      ...baseLayers(palette),
      {
        id: "ahead",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": palette.ahead, "line-dasharray": [1, 2], "line-width": 3 },
        source: "ahead",
        type: "line",
      },
      {
        id: "travelled",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": palette.travelled, "line-width": 4 },
        source: "travelled",
        type: "line",
      },
      {
        id: "stops",
        paint: {
          "circle-color": ["case", ["get", "isBehind"], palette.travelled, palette.halo],
          "circle-radius": 5,
          "circle-stroke-color": ["case", ["get", "isBehind"], palette.halo, palette.ahead],
          "circle-stroke-width": 2,
        },
        source: "stops",
        type: "circle",
      },
    ],
    sources: {
      ahead: { data: ahead, type: "geojson" },
      openmaptiles: {
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
      stops: { data: stopsData(points, at), type: "geojson" },
      travelled: { data: travelled, type: "geojson" },
    },
    version: 8,
  }
}

/**
 * A basemap with layers of the caller's own on top – the shared ground under every map the
 * journey draws.
 * @param palette The theme's colors.
 * @param sources The caller's GeoJSON sources, by id.
 * @param layers The caller's layers, drawn over the basemap in order.
 * @returns The style to hand the map.
 */
export function basemapStyle(
  palette: RoutePalette,
  sources: Readonly<Record<string, GeoJSON.FeatureCollection>>,
  layers: readonly LayerSpecification[],
): StyleSpecification {
  return {
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [...baseLayers(palette), ...layers],
    sources: {
      openmaptiles: {
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
      ...Object.fromEntries(
        Object.entries(sources).map(([id, data]) => [id, { data, type: "geojson" as const }]),
      ),
    },
    version: 8,
  }
}

/**
 * Points as GeoJSON.
 * @param points The points.
 * @returns The feature collection.
 */
export function pointsData(points: readonly Coordinates[]): GeoJSON.FeatureCollection {
  return {
    features: points.map((point) => ({
      geometry: { coordinates: [point.longitude, point.latitude], type: "Point" as const },
      properties: {},
      type: "Feature" as const,
    })),
    type: "FeatureCollection",
  }
}
