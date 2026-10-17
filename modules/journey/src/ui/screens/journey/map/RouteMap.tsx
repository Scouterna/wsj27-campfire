import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useEffect, useEffectEvent, useMemo, useRef, type ReactElement } from "react"

import {
  positionAt,
  route,
  type Coordinates,
  type ItineraryItem,
  type RoutePoint,
} from "../../../../model/Itinerary"
import { readPalette, routeMapStyle, splitRoute, stopsData } from "./route-style"

import "maplibre-gl/dist/maplibre-gl.css"
import "./palette.css"
import "./RouteMap.css"

export type RouteMapProps = {
  /**
   * The moment looked at, which decides where the unit's dot is and how much of the route
   * is travelled.
   */
  readonly at: Date
  /**
   * The unit's items, in start order.
   */
  readonly items: readonly ItineraryItem[]
}

const swedish: Readonly<Record<string, string>> = {
  "AttributionControl.ToggleAttribution": "Visa eller dölj källorna",
  "CooperativeGesturesHandler.MacHelpText": "Håll ned ⌘ och scrolla för att zooma kartan",
  "CooperativeGesturesHandler.MobileHelpText": "Använd två fingrar för att flytta kartan",
  // eslint-disable-next-line no-secrets/no-secrets -- MapLibre's key for the text, not a secret
  "CooperativeGesturesHandler.WindowsHelpText": "Håll ned Ctrl och scrolla för att zooma kartan",
  "Map.Title": "Karta",
  "NavigationControl.ZoomIn": "Zooma in",
  "NavigationControl.ZoomOut": "Zooma ut",
}

/**
 * Whether the browser can give a map a WebGL context – without one there is no map to
 * draw, and the screen goes on without it.
 * @returns True when a context can be made.
 */
function canUseWebGl(): boolean {
  try {
    return document.createElement("canvas").getContext("webgl2") !== null
  } catch {
    return false
  }
}

/**
 * Builds the map over the route, with its controls and the dot where the unit is.
 * @param container The element the map draws in.
 * @param points The route.
 * @param start Where the unit is when the map is built.
 * @param at The moment the map is built for.
 * @returns The map, the dot, and the frame the route fits in – or undefined when the
 *   browser refused a context after all.
 */
function buildMap(
  container: HTMLElement,
  points: readonly RoutePoint[],
  start: Coordinates | undefined,
  at: Date,
):
  | { readonly bounds: LngLatBounds; readonly map: MapLibreMap; readonly marker: Marker }
  | undefined {
  setWorkerUrl(workerUrl)
  const bounds = new LngLatBounds()
  for (const point of points) {
    bounds.extend([point.longitude, point.latitude])
  }
  let map: MapLibreMap
  try {
    map = new MapLibreMap({
      attributionControl: false,
      bounds,
      container,
      cooperativeGestures: true,
      dragRotate: false,
      fitBoundsOptions: { maxZoom: 9, padding: 36 },
      locale: swedish,
      pitchWithRotate: false,
      style: routeMapStyle(readPalette(container), points, at, start),
      touchPitch: false,
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
  } catch {
    // Thrown when a context could be made in the probe but not here.
    return undefined
  }
  map.on("error", () => {
    // A tile that does not arrive leaves the route standing on the plain land.
  })
  map.addControl(new NavigationControl({ showCompass: false }), "bottom-right")
  map.addControl(new AttributionControl({ compact: true }), "bottom-left")
  const element = document.createElement("span")
  element.className = "route-map-here"
  const marker = new Marker({ anchor: "center", element })
  if (start !== undefined) {
    marker.setLngLat([start.longitude, start.latitude]).addTo(map)
  }
  return { bounds, map, marker }
}

/**
 * The unit's whole route on a real map in the theme's colors – travelled solid, ahead
 * dotted, every stop a ring – with a pulsing dot where the unit is at the moment, moving
 * along the line while it travels. The map is built once per itinerary; moving the moment
 * only moves the dot and redraws the two stretches.
 * @param props The moment and the items.
 * @returns The map, or nothing when no place in the plan has coordinates or the browser
 *   cannot draw it.
 */
export function RouteMap(props: RouteMapProps): ReactElement | null {
  const { at, items } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | undefined>(undefined)
  const markerRef = useRef<Marker | undefined>(undefined)
  const canDraw = useMemo(() => canUseWebGl(), [])
  const points = useMemo(() => route(items), [items])
  const position = positionAt(items, at)
  // Read when the map is built, so a new moment moves the dot rather than rebuilding it.
  const initialAt = useEffectEvent(() => at)

  useEffect(() => {
    const container = containerRef.current
    if (container === null || points.length === 0 || !canDraw) {
      return
    }
    const built = buildMap(container, points, positionAt(items, initialAt()), initialAt())
    if (built === undefined) {
      return
    }
    const { bounds, map, marker } = built
    markerRef.current = marker
    mapRef.current = map
    // The map's box settles after it is built, as the card beside it lays out, and a
    // resized canvas is blank until drawn again.
    const observer = new ResizeObserver(() => {
      map.resize()
      map.fitBounds(bounds, { animate: false, maxZoom: 9, padding: 36 })
      map.redraw()
    })
    observer.observe(container)
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = undefined
      markerRef.current = undefined
    }
  }, [canDraw, items, points])

  const latitude = position?.latitude
  const longitude = position?.longitude
  const isMoving = position?.isMoving ?? false
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (map === undefined || marker === undefined) {
      return
    }
    const here =
      latitude === undefined || longitude === undefined ? undefined : { latitude, longitude }
    const apply = (): void => {
      const { ahead, travelled } = splitRoute(points, at, here)
      void map.getSource<GeoJSONSource>("ahead")?.setData(ahead)
      void map.getSource<GeoJSONSource>("travelled")?.setData(travelled)
      void map.getSource<GeoJSONSource>("stops")?.setData(stopsData(points, at))
    }
    if (here === undefined) {
      marker.remove()
    } else {
      marker.setLngLat([here.longitude, here.latitude]).addTo(map)
      marker.getElement().classList.toggle("route-map-here-moving", isMoving)
    }
    if (map.getSource("ahead") === undefined) {
      map.once("load", apply)
    } else {
      apply()
    }
    return () => {
      map.off("load", apply)
    }
  }, [at, isMoving, latitude, longitude, points])

  if (!canDraw || points.length === 0) {
    return null
  }
  return (
    <div aria-label="Karta över resan" className="route-map" role="region">
      <div className="route-map-canvas" ref={containerRef} />
    </div>
  )
}
