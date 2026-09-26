import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react"

import { placeTowns } from "./geography"
import { UnitMap } from "./UnitMap"

import "./UnitPlaces.css"

export interface UnitPlacesProps {
  /**
   * Each of the unit's people's home town, absent where the service sent none.
   */
  readonly homeTowns: readonly (string | undefined)[]
  /**
   * Whether the open card fills the screen.
   */
  readonly isFullScreen: boolean
  /**
   * Whether the card is opened up to the map.
   */
  readonly isOpen: boolean
  /**
   * Grows the open card to fill the screen, or shrinks it back.
   */
  readonly onFullScreenToggle: () => void
  /**
   * Opens the card up to the map, or folds it back.
   */
  readonly onToggle: () => void
  /**
   * What the folded card says it opens – "Se var ni bor" to the unit's own leader, and
   * words that do not say "ni" to anybody looking at somebody else's unit.
   */
  readonly openLabel: string
}

/**
 * Where a unit lives, for its card: the map as a dimmed backdrop the whole card opens
 * from, and once opened, the map in full with the controls that fold it back and grow it
 * to fill the screen. Nothing when no home town is on the map, or when the map cannot be
 * drawn, so the card is then the unit's identity alone.
 *
 * The default export is what the card loads lazily – the map library and the postorter
 * are several hundred kilobytes, and only a unit's card ever draws them.
 *
 * @param props The home towns, how far the card is open, and how to open it further.
 * @returns The map and its controls, or nothing.
 */
export function UnitPlaces(props: UnitPlacesProps): ReactElement | null {
  const spots = useMemo(() => placeTowns(props.homeTowns), [props.homeTowns])
  const [hasFailed, setHasFailed] = useState(false)
  // Kept the same across renders, because the map is rebuilt whenever it changes.
  const onFailure = useCallback(() => {
    setHasFailed(true)
  }, [])

  // The control that leaves full screen is drawn with the map, so a map that goes away
  // while the card fills the screen shrinks the card back itself rather than leaving no
  // way out.
  const { isFullScreen, onFullScreenToggle } = props
  const hasNothingToShow = spots.length === 0 || hasFailed
  useEffect(() => {
    if (hasNothingToShow && isFullScreen) {
      onFullScreenToggle()
    }
  }, [hasNothingToShow, isFullScreen, onFullScreenToggle])

  if (hasNothingToShow) {
    return null
  }

  return (
    <>
      <UnitMap
        isFullScreen={props.isFullScreen}
        isOpen={props.isOpen}
        onFailure={onFailure}
        spots={spots}
      />
      {/* Folded, the toggle is stretched over the whole card, so the card itself is what
          opens; opened, it is the hint alone, left where it was, so the place that opened
          the map is the place that folds it back. The toggle keeps its place among the
          controls either way, so it keeps the focus as the card opens. Full screen has
          only the way back to the card. */}
      <div className={props.isOpen ? "unit-places-controls" : "unit-places-controls-folded"}>
        {props.isOpen && (
          <button className="unit-places-control" onClick={props.onFullScreenToggle} type="button">
            <span className="unit-places-hint">
              {props.isFullScreen ? "Stäng helskärm" : "Helskärm"}
            </span>
          </button>
        )}
        {!props.isFullScreen && (
          <button
            aria-expanded={props.isOpen}
            className={props.isOpen ? "unit-places-control" : "unit-places-open"}
            onClick={props.onToggle}
            type="button"
          >
            <span className="unit-places-hint">
              {props.isOpen ? "Stäng kartan" : props.openLabel}
            </span>
          </button>
        )}
      </div>
    </>
  )
}

export default UnitPlaces
