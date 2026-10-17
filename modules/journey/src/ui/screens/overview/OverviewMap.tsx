import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useEffect, useRef, type ReactElement } from "react"

import type { Coordinates } from "../../../model/Itinerary"
import { basemapStyle, readPalette } from "../journey/map/route-style"

import "maplibre-gl/dist/maplibre-gl.css"
import "../journey/map/palette.css"
import "./OverviewMap.css"

/**
 * One place on the overview map and how many are there.
 */
export interface OverviewSpot {
  /**
   * How many units and patrols are there.
   */
  readonly count: number
  /**
   * Whether they are on the road rather than at a place.
   */
  readonly isMoving: boolean
  /**
   * The place's label, which names the spot.
   */
  readonly label: string
  /**
   * Where it is.
   */
  readonly position: Coordinates
}

export type OverviewMapProps = {
  /**
   * The spots to show.
   */
  readonly spots: readonly OverviewSpot[]
}

// The whole region the trip passes through, so the map holds still as the moment moves
// rather than jumping to frame whoever is where.
const region = new LngLatBounds([11.5, 53.4], [26, 59.6])

/**
 * Where everyone is at once, on one map of the region: a count at every place someone is,
 * brighter for those on the road.
 * @param props The spots.
 * @returns The map.
 */
export function OverviewMap(props: OverviewMapProps): ReactElement {
  const { spots } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | undefined>(undefined)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }
    setWorkerUrl(workerUrl)
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        attributionControl: false,
        bounds: region,
        container,
        cooperativeGestures: true,
        dragRotate: false,
        fitBoundsOptions: { padding: 24 },
        pitchWithRotate: false,
        style: basemapStyle(readPalette(container), {}, []),
        touchPitch: false,
      })
    } catch {
      // No WebGL – the list under the map says the same.
      return
    }
    map.on("error", () => {
      // A tile that does not arrive leaves the counts standing on the plain land.
    })
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right")
    map.addControl(new AttributionControl({ compact: true }), "bottom-left")
    const observer = new ResizeObserver(() => {
      map.resize()
      map.fitBounds(region, { animate: false, padding: 24 })
    })
    observer.observe(container)
    mapRef.current = map
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (map === undefined) {
      return
    }
    const markers = spots.map((spot) => {
      const element = document.createElement("span")
      element.className = spot.isMoving ? "overview-spot overview-spot-moving" : "overview-spot"
      element.textContent = String(spot.count)
      element.title = spot.label
      return new Marker({ anchor: "center", element })
        .setLngLat([spot.position.longitude, spot.position.latitude])
        .addTo(map)
    })
    return () => {
      for (const marker of markers) {
        marker.remove()
      }
    }
  }, [spots])

  return (
    <div aria-label="Karta över var alla är" className="overview-map" role="region">
      <div className="overview-map-canvas" ref={containerRef} />
    </div>
  )
}
