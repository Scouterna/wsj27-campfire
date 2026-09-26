import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

/**
 * An element that can grow out of its place to fill the screen, and shrink back into it.
 */
export interface FullScreen {
  /**
   * Whether the element fills the screen – true from the moment it starts growing until
   * it has shrunk back into its place.
   */
  readonly isFullScreen: boolean
  /**
   * Grows the element to fill the screen, or shrinks it back into its place.
   */
  readonly toggle: () => void
}

const duration = 300

/**
 * The inset from the viewport's edges that puts a fixed element over a rectangle.
 * @param rect Where the element is to sit.
 * @returns The inset, as the `inset` property takes it.
 */
function insetOver(rect: DOMRect): string {
  const viewport = document.documentElement
  const right = viewport.clientWidth - rect.right
  const bottom = viewport.clientHeight - rect.bottom
  return `${String(rect.top)}px ${String(right)}px ${String(bottom)}px ${String(rect.left)}px`
}

/**
 * Lets a manual popover grow from where it sits in the page to fill the screen, and
 * shrink back. The element stays where it is in the tree the whole time, so nothing in it
 * is rebuilt; the top layer lifts it over everything, and its stylesheet decides how it
 * looks in each place. Escape shrinks it back as well.
 *
 * The element's parent has to keep the element's place while it is lifted out, because
 * shrinking back aims for the parent's top and the height the element had.
 * @param ref The element, carrying `popover="manual"`.
 * @returns Whether it fills the screen, and the switch.
 */
export function useFullScreen(ref: RefObject<HTMLElement | null>): FullScreen {
  const [isFullScreen, setIsFullScreen] = useState(false)
  // What the element looked like in its place, which shrinking back returns it to.
  const placeRef = useRef({ height: 0, radius: "0px" })

  const enter = useCallback(() => {
    const element = ref.current
    if (element === null) {
      return
    }
    const from = element.getBoundingClientRect()
    const radius = getComputedStyle(element).borderRadius
    placeRef.current = { height: from.height, radius }
    element.showPopover()
    setIsFullScreen(true)
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.animate(
        [
          { borderRadius: radius, inset: insetOver(from) },
          { borderRadius: "0px", inset: "0px" },
        ],
        { duration, easing: "ease" },
      )
    }
  }, [ref])

  const leave = useCallback(() => {
    const element = ref.current
    const parent = element?.parentElement
    if (element === null || parent === null || parent === undefined) {
      return
    }
    const finish = (): void => {
      // Gone from the page, or put back already by a second press, it needs nothing.
      if (element.matches(":popover-open")) {
        element.hidePopover()
      }
      setIsFullScreen(false)
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish()
      return
    }
    const place = parent.getBoundingClientRect()
    const to = new DOMRect(place.left, place.top, place.width, placeRef.current.height)
    const animation = element.animate(
      [
        { borderRadius: "0px", inset: "0px" },
        { borderRadius: placeRef.current.radius, inset: insetOver(to) },
      ],
      { duration, easing: "ease" },
    )
    // A cancelled animation still has to put the element back.
    animation.addEventListener("finish", finish)
    animation.addEventListener("cancel", finish)
  }, [ref])

  useEffect(() => {
    if (!isFullScreen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        leave()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isFullScreen, leave])

  const toggle = useCallback(() => {
    if (isFullScreen) {
      leave()
    } else {
      enter()
    }
  }, [enter, isFullScreen, leave])

  return { isFullScreen, toggle }
}
