import { useLayoutEffect, useRef, type ReactElement } from "react"

import "./SegmentedControl.css"

export interface SegmentedControlProps {
  /**
   * Which segment is in force, by index.
   */
  readonly current: number
  /**
   * The segments' labels, in the order they are offered.
   */
  readonly entries: readonly string[]
  /**
   * What the whole control is called, for assistive technology – the labels name the
   * choices, not the choice being made.
   */
  readonly label: string
  /**
   * Fires with the chosen segment's index.
   */
  readonly onPick: (index: number) => void
}

/**
 * A segmented control: one tonal track holding every choice, the one in force raised
 * on its own pill – which slides to the segment the reader picks, so the change reads
 * as one control moving rather than buttons swapping state.
 *
 * @param props The segments, the one in force, and what picking one does.
 * @returns The control.
 */
export function SegmentedControl(props: SegmentedControlProps): ReactElement {
  const track = useRef<HTMLDivElement>(null)
  const { current, entries } = props

  // The pill's geometry, written as custom properties before paint, so it appears in
  // place on the first render and the stylesheet's transition slides it on every later
  // change. The track is observed too, so a resize – a rotation, a text-size change –
  // realigns the pill instead of leaving it where the old width put it.
  useLayoutEffect(() => {
    const list = track.current
    if (!list) {
      return
    }
    const place = (): void => {
      const target = list.querySelectorAll("button").item(current)
      if (!(target instanceof HTMLElement)) {
        return
      }
      list.style.setProperty("--segmented-pill-left", `${String(target.offsetLeft)}px`)
      list.style.setProperty("--segmented-pill-width", `${String(target.offsetWidth)}px`)
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => {
      observer.disconnect()
    }
  }, [current, entries])

  return (
    <div className="segmented" ref={track} role="group" aria-label={props.label}>
      <span className="segmented-pill" aria-hidden="true" />
      {entries.map((entry, index) => (
        <button
          // Keyed by position, because the caller picks by index.
          key={index}
          type="button"
          aria-pressed={index === current}
          // Read by the stylesheet's invisible bold copy of the label.
          data-label={entry}
          onClick={() => {
            props.onPick(index)
          }}
        >
          {entry}
        </button>
      ))}
    </div>
  )
}
