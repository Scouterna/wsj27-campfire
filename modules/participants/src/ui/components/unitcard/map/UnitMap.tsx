import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type PaddingOptions,
} from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useEffect, useRef, type ReactElement } from "react"

import type { Spot } from "./geography"
import { openLayers, readPalette, spotsData, unitMapStyle } from "./map-style"

import "maplibre-gl/dist/maplibre-gl.css"
import "./UnitMap.css"

export interface UnitMapProps {
  /**
   * Whether the map fills the screen, where it takes every gesture – one finger, and the
   * wheel alone – since there is no page left to scroll past it.
   */
  readonly isFullScreen: boolean
  /**
   * Whether the map is the card's content – counted, and a map to move around in – or
   * its backdrop, dimmed, still, and silent.
   */
  readonly isOpen: boolean
  /**
   * Called once the map cannot be drawn at all – no WebGL – so the card can go on
   * without it.
   */
  readonly onFailure: () => void
  /**
   * Where the unit's people live.
   */
  readonly spots: readonly Spot[]
}

// MapLibre's own words – its gesture hints, its buttons, and the map's name – in Swedish,
// like every other word in the product. Only the ones this map can show.
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
 * The frame that holds every spot.
 * @param spots What has to be in view.
 * @returns The bounds to fit.
 */
function boundsOf(spots: readonly Spot[]): LngLatBounds {
  const bounds = new LngLatBounds()
  for (const spot of spots) {
    bounds.extend([spot.longitude, spot.latitude])
  }
  return bounds
}

// The height the unit's name and mark take at the top of the card, which the open map
// keeps its dots below.
const identityHeight = 136

/**
 * The room kept around the spots when the map frames them.
 * @param isOpen Whether the map is the card's content rather than its backdrop.
 * @param width The map's width.
 * @param height The map's height.
 * @returns The padding to fit the spots within.
 */
function framePadding(isOpen: boolean, width: number, height: number): PaddingOptions {
  if (isOpen) {
    // The sides keep room for a count on a dot at the edge. The top shrinks with the
    // map while the card is still growing, because a padding larger than the map leaves
    // nothing to fit the spots in.
    return { bottom: 40, left: 40, right: 40, top: Math.min(identityHeight, height / 3) }
  }
  // As a backdrop, the dots keep to the trailing half, clear of the unit's name.
  return { bottom: 24, left: Math.round(width * 0.5), right: 24, top: 24 }
}

/**
 * Frames every spot in the map as it is sized now, at once rather than animated, since
 * it is called on every step of the card growing or shrinking around it.
 * @param map The map to frame.
 * @param spots What has to be in view.
 * @param isOpen Whether the map is the card's content rather than its backdrop.
 */
function frame(map: MapLibreMap, spots: readonly Spot[], isOpen: boolean): void {
  const container = map.getContainer()
  map.fitBounds(boundsOf(spots), {
    animate: false,
    // A unit that lives in one town still shows the region around it.
    maxZoom: isOpen ? 11 : 9,
    padding: framePadding(isOpen, container.clientWidth, container.clientHeight),
  })
}

/**
 * How many live at a spot, as a marker over the dot that carries the number. Drawn as an
 * element over the map rather than as map text, because map text needs fonts from the
 * tile service, and the counts have to stand when it does not answer.
 * @param map The map to put the count on.
 * @param spot The spot to count.
 */
function addCount(map: MapLibreMap, spot: Spot): void {
  // MapLibre writes the marker's own opacity inline, so the count is a box inside it,
  // free to fade with the map.
  const element = document.createElement("span")
  element.className = "unit-map-count-marker"
  const count = document.createElement("span")
  count.className = "unit-map-count"
  count.textContent = String(spot.count)
  element.append(count)
  new Marker({ anchor: "center", element }).setLngLat([spot.longitude, spot.latitude]).addTo(map)
}

/**
 * Puts what only the open map shows over it – the zoom buttons, the credits, and the
 * counts. They go on the backdrop too, hidden by its stylesheet, so they fade in with the
 * open map rather than arriving after it.
 * @param map The map to put them on.
 * @param spots The spots to count.
 */
function addOverlays(map: MapLibreMap, spots: readonly Spot[]): void {
  map.addControl(new NavigationControl({ showCompass: false }), "bottom-right")
  map.addControl(new AttributionControl({ compact: true }), "bottom-left")
  for (const spot of spots) {
    if (spot.count > 1) {
      addCount(map, spot)
    }
  }
}

/**
 * The unit's home region on a real map, drawn in the unit's own colors, with a dot
 * wherever somebody in it lives. As the card's backdrop it is still and dimmed, with the
 * dots kept clear of the card's text; as the card's content it puts the count on every
 * town more than one person lives in, and pans and zooms – with two fingers, or Ctrl and
 * the wheel, so the page still scrolls past it, and with any gesture once it fills the
 * screen. Opened, it names the region's towns as any map does, but never who lives in
 * them.
 *
 * It is one map in both states, reframed on every step of the card opening or folding
 * around it, so the backdrop grows into the open map rather than being swapped for it.
 *
 * Only the background and its names come from the tile service. Offline, or with the
 * service down, the map is the palette's land with every dot and count still on it.
 *
 * @param props The places, whether the map is the backdrop or the content, and what to
 *   do when it cannot be drawn.
 * @returns The map's container.
 */
export function UnitMap(props: UnitMapProps): ReactElement {
  const { isFullScreen, isOpen, onFailure, spots } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | undefined>(undefined)
  // Read by the map as it is built and resized, so opening it changes the map rather
  // than building another.
  const isOpenRef = useRef(isOpen)
  // A reader who has moved the open map keeps where they put it when the window resizes.
  const hasMovedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }
    // MapLibre finds its worker beside its own module, which a bundle does not keep, so
    // the worker is bundled on its own and handed over by address before a map needs it.
    setWorkerUrl(workerUrl)
    const width = container.clientWidth
    const height = container.clientHeight
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        attributionControl: false,
        bounds: boundsOf(spots),
        container,
        cooperativeGestures: true,
        // North stays up and the map stays flat, because there is no compass to turn it
        // back with, and a tilted region says nothing more about where people live.
        dragRotate: false,
        fitBoundsOptions: {
          maxZoom: isOpenRef.current ? 11 : 9,
          padding: framePadding(isOpenRef.current, width, height),
        },
        locale: swedish,
        pitchWithRotate: false,
        style: unitMapStyle(readPalette(container), spots, isOpenRef.current),
        touchPitch: false,
      })
      map.touchZoomRotate.disableRotation()
      map.keyboard.disableRotation()
    } catch {
      // Thrown when the browser gives no WebGL context.
      onFailure()
      return
    }
    // A tile that does not arrive is the ordinary state on a field in Poland, and the
    // dots stand without it, so a failed request is no error to report.
    map.on("error", () => {
      // Handled by drawing on without it.
    })
    map.on("movestart", (event) => {
      if (event.originalEvent !== undefined) {
        hasMovedRef.current = true
      }
    })
    addOverlays(map, spots)
    // Resizing the canvas clears it, and MapLibre would draw again only on the next frame,
    // so the map is drawn at once – or it is blank on every step of the card growing.
    const observer = new ResizeObserver(() => {
      map.resize()
      if (!hasMovedRef.current) {
        frame(map, spots, isOpenRef.current)
      }
      map.redraw()
    })
    observer.observe(container)
    mapRef.current = map
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = undefined
    }
  }, [onFailure, spots])

  useEffect(() => {
    isOpenRef.current = isOpen
    hasMovedRef.current = false
    const map = mapRef.current
    if (map === undefined) {
      return
    }
    const apply = (): void => {
      void map.getSource<GeoJSONSource>("spots")?.setData(spotsData(spots, isOpen))
      for (const layer of openLayers) {
        map.setLayoutProperty(layer, "visibility", isOpen ? "visible" : "none")
      }
      frame(map, spots, isOpen)
    }
    // A map whose style is still being read has none of its layers yet, and draws the
    // state it was built in, so the change waits for it.
    if (map.getLayer(openLayers[0]) !== undefined) {
      apply()
      return
    }
    map.once("style.load", apply)
    return () => {
      map.off("style.load", apply)
    }
  }, [isOpen, spots])

  // Run again after the map is rebuilt, which starts it with the gestures shared.
  useEffect(() => {
    mapRef.current?.cooperativeGestures[isFullScreen ? "disable" : "enable"]()
  }, [isFullScreen, spots])

  return (
    <div
      aria-label={isOpen ? "Karta över var avdelningen bor" : undefined}
      className={isOpen ? "unit-map unit-map-open" : "unit-map unit-map-backdrop"}
      // The backdrop is decoration, out of reach of the pointer, the keyboard, and
      // assistive technology alike; opened, the map is a region of its own.
      inert={!isOpen}
      role={isOpen ? "region" : undefined}
    >
      {/* MapLibre's own stylesheet positions its container outside any layer, so the
          container is an inner box and the placement stays on the outer one. */}
      <div className="unit-map-canvas" ref={containerRef} />
    </div>
  )
}
