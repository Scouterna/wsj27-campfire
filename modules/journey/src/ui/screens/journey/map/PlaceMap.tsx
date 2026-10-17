import { LngLatBounds, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useEffect, useRef, useState, type ReactElement } from "react"

import type { Coordinates, ItineraryItem } from "../../../../model/Itinerary"
import { basemapStyle, lineData, pointsData, readPalette } from "./route-style"

import "./palette.css"
import "./PlaceMap.css"

export type PlaceMapProps = {
  /**
   * The item whose place is shown – a pin where it happens, or the line a journey takes.
   */
  readonly item: ItineraryItem
}

/**
 * Where an item is, as a small map in the timeline: a pin on the place, or a line from where
 * a journey starts to where it ends. It is still – a picture of the place rather than a map
 * to move around in.
 *
 * A browser keeps only so many maps alive at once, and a timeline has many, so the map is
 * built only while it is near the screen and taken down when it scrolls away, with the
 * land's color holding its place in between.
 * @param props The item.
 * @returns The map, or nothing when the item names no place on the map.
 */
export function PlaceMap(props: PlaceMapProps): ReactElement | null {
  const { item } = props
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isNear, setIsNear] = useState(false)
  const ends = endsOf(item)

  useEffect(() => {
    const frame = frameRef.current
    if (frame === null) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setIsNear(entries.some((entry) => entry.isIntersecting))
      },
      { rootMargin: "300px 0px" },
    )
    observer.observe(frame)
    return () => {
      observer.disconnect()
    }
  }, [])

  const first = ends[0]
  const last = ends.at(-1)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!isNear || canvas === null || first === undefined || last === undefined) {
      return
    }
    setWorkerUrl(workerUrl)
    const points = first === last ? [first] : [first, last]
    const bounds = new LngLatBounds()
    for (const point of points) {
      bounds.extend([point.longitude, point.latitude])
    }
    const palette = readPalette(canvas)
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        attributionControl: false,
        bounds,
        container: canvas,
        fitBoundsOptions: { maxZoom: 10, padding: 28 },
        interactive: false,
        style: basemapStyle(palette, { ends: pointsData(points), line: lineData(points) }, [
          {
            id: "line",
            layout: { "line-cap": "round" },
            paint: { "line-color": palette.travelled, "line-dasharray": [1, 1.6], "line-width": 3 },
            source: "line",
            type: "line",
          },
          {
            id: "ends",
            paint: {
              "circle-color": palette.travelled,
              "circle-radius": 6,
              "circle-stroke-color": palette.halo,
              "circle-stroke-width": 2.5,
            },
            source: "ends",
            type: "circle",
          },
        ]),
      })
    } catch {
      // No context to draw in – the land's color stays in the map's place.
      return
    }
    map.on("error", () => {
      // A tile that does not arrive leaves the pin standing on the plain land.
    })
    return () => {
      map.remove()
    }
  }, [first, isNear, last])

  if (first === undefined) {
    return null
  }
  return (
    <div aria-hidden="true" className="place-map" ref={frameRef}>
      <div className="place-map-canvas" ref={canvasRef} />
    </div>
  )
}

/**
 * Where an item is on the map – both ends of a journey, or its one place.
 * @param item The item.
 * @returns The coordinates, none when the plan has no position for it.
 */
function endsOf(item: ItineraryItem): readonly Coordinates[] {
  if (item.kind === "travel") {
    const from = item.from?.coordinates
    const to = item.to?.coordinates
    return from === undefined || to === undefined ? [] : [from, to]
  }
  const here = item.place?.coordinates
  return here === undefined ? [] : [here]
}
