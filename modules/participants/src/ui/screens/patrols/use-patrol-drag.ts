import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"

/**
 * Where a dragged person can land: a patrol by its place, or `"none"` for the people in
 * no patrol. Read off the `data-patrol-drop` attribute of whatever is under the pointer.
 */
export type DropTarget = number | "none"

/**
 * A drag in progress – who is carried, where the pointer is, and what it is over.
 */
export interface Drag {
  /**
   * The person being carried.
   */
  readonly memberNo: string
  /**
   * What lies under the pointer, or absent over nowhere a person can land.
   */
  readonly over?: DropTarget
  /**
   * The chip's width when it was picked up, so the carried copy keeps its size.
   */
  readonly width: number
  /**
   * Where the carried chip's left edge is, in viewport pixels.
   */
  readonly x: number
  /**
   * Where the carried chip's top edge is, in viewport pixels.
   */
  readonly y: number
}

/**
 * What the screen draws a drag with, and the handler a chip picks itself up with.
 */
export interface PatrolDrag {
  /**
   * The drag in progress, or undefined while nobody is carried.
   */
  readonly drag: Drag | undefined
  /**
   * The chip's `onPointerDown`, for the person it names.
   */
  readonly pickUp: (memberNo: string) => (event: PointerEvent<HTMLElement>) => void
}

// A finger has to rest on a chip this long before it lifts, because a finger that moves at
// once is scrolling the page, and a list of people is mostly scrolled through.
const holdMs = 260
// How far a finger may wander while resting before the rest counts as a scroll, and how
// far a mouse has to move before a press counts as a drag rather than a click.
const touchSlop = 8
const mouseSlop = 4
// How near the viewport's edge the pointer has to be before the page scrolls under it,
// and how fast it scrolls at the very edge, in pixels a frame.
const edge = 72
const fastest = 14

/**
 * The drop target at a point, if any.
 * @param x The point, in viewport pixels.
 * @param y The point, in viewport pixels.
 * @returns The patrol, `"none"`, or undefined over nowhere a person can land.
 */
function targetAt(x: number, y: number): DropTarget | undefined {
  const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-patrol-drop]")
  const value = zone?.dataset["patrolDrop"]
  if (value === undefined) {
    return undefined
  }
  return value === "none" ? "none" : Number(value)
}

/**
 * The element whose scrolling moves `node`, or the document's own scroller when nothing
 * closer does – the browser chrome scrolls its content column, the shells the document.
 * @param node Where the drag started.
 * @returns What to scroll while the pointer rests near an edge.
 */
function scrollerOf(node: HTMLElement): Element {
  for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent
    }
  }
  return document.scrollingElement ?? document.documentElement
}

/**
 * How far to scroll this frame for a pointer at a height – faster the nearer the edge,
 * and nothing away from both.
 * @param y The pointer's height in the viewport.
 * @returns The pixels to scroll, negative for up.
 */
function scrollStep(y: number): number {
  const intoTop = edge - y
  if (intoTop > 0) {
    return -Math.min(fastest, (intoTop / edge) * fastest)
  }
  const intoBottom = y - (innerHeight - edge)
  return intoBottom > 0 ? Math.min(fastest, (intoBottom / edge) * fastest) : 0
}

/**
 * Stops the click the browser sends when a carried chip is let go over where it was
 * picked up, which would otherwise read as a press that picks the person. Given up after
 * the current task, so a click that never comes cannot swallow a later one.
 */
function swallowNextClick(): void {
  addEventListener("click", swallow, { capture: true, once: true })
  setTimeout(() => {
    removeEventListener("click", swallow, { capture: true })
  }, 0)
}

/**
 * Stops a click from reaching anything.
 * @param click The click.
 */
function swallow(click: MouseEvent): void {
  click.stopPropagation()
  click.preventDefault()
}

/**
 * What following one press needs from the hook that started it.
 */
interface Press {
  /**
   * The press that may become a drag.
   */
  readonly event: PointerEvent<HTMLElement>
  /**
   * Who the pressed chip is.
   */
  readonly memberNo: string
  /**
   * Called when the person is put down somewhere they can land.
   */
  readonly onDrop: (memberNo: string, target: DropTarget) => void
  /**
   * Called with the drag as it moves, and with undefined once it is over.
   */
  readonly onMove: (drag: Drag | undefined) => void
}

/**
 * Follows one press from the moment it lands until it lets go: it lifts the chip once
 * the press is a drag, carries it after the pointer while the page scrolls at the edges,
 * and puts it down wherever it is let go.
 * @param press The press, and whom to tell as it goes.
 */
function follow(press: Press): void {
  const { event, memberNo, onDrop, onMove } = press
  const chip = event.currentTarget
  const box = chip.getBoundingClientRect()
  const start = { x: event.clientX, y: event.clientY }
  const pointer = { ...start }
  const isTouch = event.pointerType === "touch"
  const state: {
    frame?: number
    isCarrying: boolean
    scroller?: Element
    timer?: ReturnType<typeof setTimeout>
  } = { isCarrying: false }

  const place = (): void => {
    const over = targetAt(pointer.x, pointer.y)
    onMove({
      memberNo,
      width: box.width,
      x: pointer.x - (start.x - box.left),
      y: pointer.y - (start.y - box.top),
      ...(over !== undefined && { over }),
    })
  }

  // The page scrolls under a pointer resting near an edge, and what is under the pointer
  // is asked again, because the page moved under it.
  const scrollFrame = (): void => {
    const step = scrollStep(pointer.y)
    if (step !== 0 && state.scroller !== undefined) {
      state.scroller.scrollBy(0, step)
      place()
    }
    state.frame = requestAnimationFrame(scrollFrame)
  }

  const lift = (): void => {
    state.isCarrying = true
    state.scroller = scrollerOf(chip)
    // Absent in Safari, so the lift is felt only where the platform offers it.
    if ("vibrate" in navigator) {
      navigator.vibrate(8)
    }
    place()
    state.frame = requestAnimationFrame(scrollFrame)
  }

  const finish = (): void => {
    clearTimeout(state.timer)
    if (state.frame !== undefined) {
      cancelAnimationFrame(state.frame)
    }
    removeEventListener("pointermove", move)
    removeEventListener("pointerup", up)
    removeEventListener("pointercancel", cancel)
    onMove(undefined)
  }

  function move(moved: globalThis.PointerEvent): void {
    if (moved.pointerId !== event.pointerId) {
      return
    }
    pointer.x = moved.clientX
    pointer.y = moved.clientY
    const distance = Math.hypot(pointer.x - start.x, pointer.y - start.y)
    if (state.isCarrying) {
      place()
    } else if (isTouch && distance > touchSlop) {
      // Moved before the rest was up – a scroll, which the browser is already doing.
      finish()
    } else if (!isTouch && distance > mouseSlop) {
      lift()
    }
  }

  function up(released: globalThis.PointerEvent): void {
    if (released.pointerId !== event.pointerId) {
      return
    }
    const target = state.isCarrying ? targetAt(released.clientX, released.clientY) : undefined
    if (state.isCarrying) {
      swallowNextClick()
    }
    finish()
    if (target !== undefined) {
      onDrop(memberNo, target)
    }
  }

  function cancel(cancelled: globalThis.PointerEvent): void {
    if (cancelled.pointerId === event.pointerId) {
      finish()
    }
  }

  addEventListener("pointermove", move)
  addEventListener("pointerup", up)
  addEventListener("pointercancel", cancel)
  if (isTouch) {
    state.timer = setTimeout(lift, holdMs)
  } else {
    // A mouse dragging across the page would otherwise select the text it passes.
    event.preventDefault()
  }
}

/**
 * Picking people up and putting them down with a pointer – a mouse the moment it moves,
 * and a finger once it has rested on the chip, so a finger can still scroll the page by
 * swiping across the people.
 *
 * Built on pointer events rather than the platform's drag and drop, which a phone's
 * browser either does not offer or offers only after a long press it decorates with a
 * menu of its own. While a person is carried the page scrolls itself near the viewport's
 * edges, because a unit's patrols are taller than a phone.
 * @param onDrop Called when a person is put down somewhere they can land.
 * @returns The drag in progress, and what a chip picks itself up with.
 */
export function usePatrolDrag(onDrop: (memberNo: string, target: DropTarget) => void): PatrolDrag {
  const [drag, setDrag] = useState<Drag | undefined>(undefined)
  // Read by the window's listeners, which outlive any one render.
  const carrying = useRef(false)
  const dropRef = useRef(onDrop)
  useEffect(() => {
    dropRef.current = onDrop
  }, [onDrop])

  // A finger carrying somebody must not scroll the page underneath – and whether it does
  // is only decided on the move, so the listener is always there and asks each time.
  // Not passive, since a passive listener cannot refuse the scroll.
  useEffect(() => {
    const refuseScroll = (event: TouchEvent): void => {
      if (carrying.current) {
        event.preventDefault()
      }
    }
    addEventListener("touchmove", refuseScroll, { passive: false })
    return () => {
      removeEventListener("touchmove", refuseScroll)
    }
  }, [])

  const pickUp = useCallback(
    (memberNo: string) =>
      (event: PointerEvent<HTMLElement>): void => {
        // The chip's own controls – its menu, its care popover – are pressed, not carried.
        // The chip's body is a button too, for picking, and that one carries.
        const pressed = event.target as HTMLElement
        if (!event.isPrimary || event.button !== 0 || pressed.closest("a, input, [data-no-drag]")) {
          return
        }
        follow({
          event,
          memberNo,
          onDrop: (dropped, target) => {
            dropRef.current(dropped, target)
          },
          onMove: (next) => {
            carrying.current = next !== undefined
            setDrag(next)
          },
        })
      },
    [],
  )

  return { drag, pickUp }
}
