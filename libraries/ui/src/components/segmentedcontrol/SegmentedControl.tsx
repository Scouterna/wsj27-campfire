import { useLayoutEffect, useRef, type ReactElement } from "react"

import { Count } from "../count/Count"

import "./SegmentedControl.css"

/**
 * How large a segmented control stands: the default for the choice a screen turns on, and
 * small for one tucked beside a heading, where the default would outweigh it.
 */
export type SegmentedControlSize = "default" | "small"

/**
 * The segments, the one in force, how many each holds, and what picking one does.
 */
export interface SegmentedControlProps {
  /**
   * What a count counts, in words for assistive technology – "3 ärenden" – read after
   * the segment's label in place of the bare number. Left out, the number is read as it
   * is.
   */
  readonly countSaid?: ((count: number) => string) | undefined
  /**
   * How many things each segment holds, by index, shown small beside its label where
   * there is at least one. Left out, or undefined for a segment, nothing is shown.
   */
  readonly counts?: readonly (number | undefined)[] | undefined
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
  /**
   * How large it stands, the default unless said.
   */
  readonly size?: SegmentedControlSize | undefined
}

/**
 * A segmented control: one tonal track holding every choice, the one in force raised
 * on its own pill – which slides to the segment the reader picks, so the change reads
 * as one control moving rather than buttons swapping state. A segment can carry how many
 * things it holds, small beside its label, and said in words after it.
 *
 * @param props The segments, the one in force, how many each holds, and what picking one
 * does.
 * @returns The control.
 */
export function SegmentedControl(props: SegmentedControlProps): ReactElement {
  const track = useRef<HTMLDivElement>(null)
  const { counts, current, entries } = props

  // The pill's geometry, written as custom properties before paint, so it appears in
  // place on the first render and the stylesheet's transition slides it on every later
  // change – a count arriving on a segment to the left of it included, which moves the
  // segment in force without resizing the track. The track is observed too, so a resize –
  // a rotation, a text-size change – realigns the pill instead of leaving it where the old
  // width put it.
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
  }, [counts, current, entries])

  return (
    <div
      aria-label={props.label}
      className={props.size === "small" ? "segmented segmented-small" : "segmented"}
      ref={track}
      role="group"
    >
      <span className="segmented-pill" aria-hidden="true" />
      {entries.map((entry, index) => {
        const count = counts?.at(index)
        return (
          <button
            // Keyed by position, because the caller picks by index.
            key={index}
            type="button"
            aria-pressed={index === current}
            onClick={() => {
              props.onPick(index)
            }}
          >
            {/* Read by the stylesheet's invisible bold copy of the label. */}
            <span className="segmented-label" data-label={entry}>
              {entry}
            </span>
            {count !== undefined && count > 0 && (
              <Count
                said={`, ${props.countSaid === undefined ? String(count) : props.countSaid(count)}`}
                size="small"
              >
                {count}
              </Count>
            )}
          </button>
        )
      })}
    </div>
  )
}
