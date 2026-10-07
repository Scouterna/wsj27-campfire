import { useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"

import { exportSize } from "../../../model/social/Frame"
import {
  moveBy,
  resized,
  turned,
  type Placement,
  type Point,
} from "../../../model/social/placement"

/**
 * The handlers a picture takes so the reader can place its text by hand.
 */
export interface TextGestureHandlers {
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  readonly onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerCancel: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void
}

/**
 * One text the gestures can move: which it is, where it is, and the size it is drawn at
 * as a share of the picture's height.
 */
export interface MovableText {
  readonly id: string
  readonly placement: Placement
  readonly size: number
}

/**
 * What the picture's gestures act on, and what they report.
 */
export interface TextGestureOptions {
  /**
   * Which text is under a point on the finished image, the topmost where texts overlap,
   * or undefined for none.
   */
  readonly hit: (point: Point) => string | undefined
  /**
   * Takes the placement a gesture leaves for a text.
   */
  readonly onPlace: (id: string, next: Placement) => void
  /**
   * Removes a text, which Delete or Backspace asks for the selected one.
   */
  readonly onRemove: (id: string) => void
  /**
   * Takes the text a drag has taken hold of.
   */
  readonly onSelect: (id: string) => void
  /**
   * Takes the text a tap landed on, or undefined for a tap beside every text.
   */
  readonly onTap: (id: string | undefined) => void
  /**
   * The text the keys act on.
   */
  readonly selected: string | undefined
  /**
   * Every text there is to move.
   */
  readonly texts: readonly MovableText[]
}

/**
 * Where a drag began: the text held, where it was then, and where the pointer touched.
 */
interface Anchor {
  readonly id: string
  readonly placement: Placement
  readonly point: Point
}

/**
 * How far one press of an arrow key moves the text, in the finished image's pixels, and
 * how far with shift held.
 */
const step = { far: 50, near: 10 } as const

/**
 * How far a press can wander, in the finished image's pixels, and still be a tap rather
 * than a drag.
 */
const tapSlop = 12

/**
 * How much one size step grows the text by.
 */
export const sizeStep = 1.15

/**
 * Lets the reader place text on a picture: the pointer drags the text it lands on, a
 * press that does not move is a tap, and the keys act on the selected text – the arrows
 * nudge it, plus and minus size it a step, the square brackets turn it a quarter, and
 * Delete removes it.
 *
 * A drag is measured from where it began rather than from the last event, so rounding
 * never builds up.
 * @param options the texts, which is selected, how to find the one under a point, and
 * what the gestures report
 * @returns The handlers to spread on the picture.
 */
export function useTextGestures(options: TextGestureOptions): TextGestureHandlers {
  const anchor = useRef<Anchor>(undefined)
  const pointer = useRef<number>(undefined)
  // Whether the press under way has wandered far enough to be a drag.
  const dragged = useRef(false)
  // The newest texts, so a press reads where a text is even before the render that
  // carries its last move.
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  const release = (event: PointerEvent<HTMLElement>): void => {
    if (event.pointerId !== pointer.current) {
      return
    }
    pointer.current = undefined
    anchor.current = undefined
  }

  return {
    onKeyDown: (event) => {
      const text = options.texts.find((candidate) => candidate.id === options.selected)
      if (text === undefined || event.target !== event.currentTarget) {
        return
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        options.onRemove(text.id)
        return
      }
      const next = keyedPlacement(event.key, event.shiftKey, text)
      if (next !== undefined) {
        event.preventDefault()
        options.onPlace(text.id, next)
      }
    },
    onLostPointerCapture: release,
    onPointerCancel: release,
    onPointerDown: (event) => {
      if (!event.isPrimary || isOwnPress(event.target)) {
        return
      }
      const point = pointOf(event)
      const id = options.hit(point)
      const text = latest.current.texts.find((candidate) => candidate.id === id)
      event.currentTarget.setPointerCapture(event.pointerId)
      pointer.current = event.pointerId
      dragged.current = false
      anchor.current = text === undefined ? undefined : { ...text, point }
    },
    onPointerMove: (event) => {
      const start = anchor.current
      if (event.pointerId !== pointer.current || start === undefined) {
        return
      }
      const point = pointOf(event)
      const by = { x: point.x - start.point.x, y: point.y - start.point.y }
      if (!dragged.current && Math.hypot(by.x, by.y) > tapSlop) {
        dragged.current = true
        options.onSelect(start.id)
      }
      if (dragged.current) {
        options.onPlace(start.id, moveBy(start.placement, by))
      }
    },
    onPointerUp: (event) => {
      if (event.pointerId === pointer.current && !dragged.current) {
        options.onTap(options.hit(pointOf(event)))
      }
      release(event)
    },
  }
}

/**
 * Whether a press belongs to what it landed on rather than to the picture: a button on the
 * picture, since capturing the press would keep its click from it, or a field that takes
 * presses, where a press places the caret rather than drags.
 * @param target what the press landed on
 * @returns Whether to leave the press alone.
 */
function isOwnPress(target: EventTarget): boolean {
  return (
    target instanceof Element &&
    (target.closest("button") !== null ||
      target.closest(".frame-slot:not(.frame-slot-held)") !== null)
  )
}

/**
 * Where a key press puts the text: the arrows move it, further with shift held, plus and
 * minus size it a step, and the square brackets turn it a quarter.
 * @param key the key pressed
 * @param isFar whether shift was held
 * @param text the text, where it is and the size it is drawn at
 * @returns The new placement, or undefined for a key that does none of these.
 */
function keyedPlacement(key: string, isFar: boolean, text: MovableText): Placement | undefined {
  const distance = isFar ? step.far : step.near
  const { placement, size } = text
  switch (key) {
    case "ArrowDown": {
      return moveBy(placement, { x: 0, y: distance })
    }
    case "ArrowLeft": {
      return moveBy(placement, { x: -distance, y: 0 })
    }
    case "ArrowRight": {
      return moveBy(placement, { x: distance, y: 0 })
    }
    case "ArrowUp": {
      return moveBy(placement, { x: 0, y: -distance })
    }
    case "+":
    case "=": {
      return resized(placement, size, sizeStep)
    }
    case "-": {
      return resized(placement, size, 1 / sizeStep)
    }
    case "[": {
      return turned(placement, -1)
    }
    case "]": {
      return turned(placement, 1)
    }
    default: {
      return undefined
    }
  }
}

/**
 * Where a pointer is on the finished image, in its pixels – the picture is shown smaller
 * than it is drawn, so its on-screen position is scaled up.
 * @param event the pointer event
 * @returns The point.
 */
function pointOf(event: PointerEvent<HTMLElement>): Point {
  const box = event.currentTarget.getBoundingClientRect()
  return {
    x: ((event.clientX - box.left) / box.width) * exportSize.width,
    y: ((event.clientY - box.top) / box.height) * exportSize.height,
  }
}
