import { useDeclareFullScreen, whenScreenSettles } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

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
   * Receives the control that toggles, which takes the focus once the element fills the
   * screen and keeps it once the element is back in its place.
   */
  readonly registerToggle: (control: HTMLButtonElement | null) => void
  /**
   * Grows the element to fill the screen, or shrinks it back into its place.
   */
  readonly toggle: () => void
}

const duration = 300

/**
 * Where the element sat in its place, which shrinking back returns it to. Kept relative
 * to the parent, because the parent is what stays in the page while the element is lifted
 * out, and the page under it can move while the chrome changes the viewport.
 */
interface Place {
  /**
   * The element's height in its place.
   */
  readonly height: number
  /**
   * How far the element's left edge sits from its parent's.
   */
  readonly left: number
  /**
   * The element's corner rounding in its place.
   */
  readonly radius: string
  /**
   * How far the element's top edge sits from its parent's.
   */
  readonly top: number
  /**
   * The element's width in its place.
   */
  readonly width: number
}

/**
 * The work in hand while the element is out of its place, or on its way out or back,
 * each part of which has to be undone when it lands or the component goes away.
 */
interface Lift {
  /**
   * Stops the animation in flight, if one is, without landing it.
   */
  cancelTravel: () => void
  /**
   * Stops holding the element over the screen it covered while the chrome brings its
   * bars back.
   */
  cancelHold: () => void
  /**
   * Keeps a pending wait for the viewport from running.
   */
  cancelWait: () => void
  /**
   * The element's own min-height before it was pinned to keep its size.
   */
  readonly elementMinHeight: string
  /**
   * The elements made inert behind the element, to be made reachable again.
   */
  inert: readonly HTMLElement[]
  /**
   * The parent's own min-height before it was pinned to keep the place.
   */
  readonly parentMinHeight: string
  /**
   * Lets the page take the viewport's width again, once nothing of it shows.
   */
  unpinPage: () => void
  /**
   * Where the element sat, measured before the chrome was told anything.
   */
  readonly place: Place
  /**
   * The page's scroll position when the element left its place.
   */
  readonly scrollY: number
}

/**
 * Stands in for a wait or a hold not yet started, so there is always something to
 * cancel.
 */
function waitingForNothing(): void {
  // Nothing is waiting yet, so nothing is cancelled.
}

/**
 * Measures where the element sits relative to its parent.
 * @param element The element, in its place.
 * @param parent The element's parent.
 * @returns The place.
 */
function placeOf(element: HTMLElement, parent: HTMLElement): Place {
  const rect = element.getBoundingClientRect()
  const box = parent.getBoundingClientRect()
  return {
    height: rect.height,
    left: rect.left - box.left,
    radius: getComputedStyle(element).borderRadius,
    top: rect.top - box.top,
    width: rect.width,
  }
}

/**
 * Where a place is in the viewport now.
 * @param place The place, relative to its parent.
 * @param parent The parent, wherever the page has it now.
 * @returns The place's rectangle in the viewport.
 */
function rectOf(place: Place, parent: HTMLElement): DOMRect {
  const box = parent.getBoundingClientRect()
  return new DOMRect(box.left + place.left, box.top + place.top, place.width, place.height)
}

/**
 * The box of a fixed element that puts it over a rectangle. A box rather than an inset
 * from each edge, because while a chrome moves its bars the viewport a fixed element is
 * laid out in and the document's own height can disagree by a bar, and a box measured
 * from the top and the left lands where it was measured either way.
 * @param rect Where the element is to sit.
 * @returns The box, as an animation's keyframe takes it.
 */
function boxOver(rect: DOMRect): Box {
  return {
    height: `${String(rect.height)}px`,
    left: `${String(rect.left)}px`,
    top: `${String(rect.top)}px`,
    width: `${String(rect.width)}px`,
  }
}

/**
 * The box of a fixed element that covers the viewport, which follows the viewport when
 * a chrome resizes it mid-way.
 */
const screenBox: Box = { height: "100%", left: "0px", top: "0px", width: "100%" }

/**
 * A fixed element's position and size, each as a CSS length.
 */
interface Box {
  /**
   * The element's height.
   */
  readonly height: string
  /**
   * The element's left edge, from the viewport's.
   */
  readonly left: string
  /**
   * The element's top edge, from the viewport's.
   */
  readonly top: string
  /**
   * The element's width.
   */
  readonly width: string
}

/**
 * Writes a box onto the element as its own style, or takes it off again.
 * @param element The element.
 * @param box The box, or undefined to leave the element to its stylesheet.
 */
function placeBox(element: HTMLElement, box: Box | undefined): void {
  for (const property of ["height", "left", "top", "width"] as const) {
    if (box === undefined) {
      element.style.removeProperty(property)
    } else {
      // eslint-disable-next-line security/detect-object-injection -- the box's own keys
      element.style.setProperty(property, box[property])
    }
  }
}

/**
 * Whether the reader asked for less motion, which puts the element in its new place at
 * once.
 * @returns True when reduced motion is asked for.
 */
function isMotionReduced(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Makes a node's siblings inert, leaving out any that already were.
 * @param node The node whose siblings go out of reach.
 * @returns The siblings made inert.
 */
function inertSiblings(node: HTMLElement): HTMLElement[] {
  const siblings = [...(node.parentElement?.children ?? [])]
  const made = siblings.filter(
    (sibling): sibling is HTMLElement =>
      sibling !== node && sibling instanceof HTMLElement && !sibling.inert,
  )
  for (const sibling of made) {
    sibling.inert = true
  }
  return made
}

/**
 * Makes everything in the document but the element and its ancestors inert, so assistive
 * technology reaches only what fills the screen, as it would in a native full-screen layer.
 * @param element The element that stays reachable.
 * @returns The elements made inert, leaving out any that already were.
 */
function inertBehind(element: HTMLElement): HTMLElement[] {
  const made: HTMLElement[] = []
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    made.push(...inertSiblings(node))
  }
  return made
}

/**
 * Calls back on Escape while something is up for Escape to put away.
 * @param isActive Whether Escape does anything now.
 * @param onEscape What Escape does.
 */
function useEscape(isActive: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!isActive) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onEscape()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isActive, onEscape])
}

/**
 * Keeps the page at the width it has now, until the returned function lets it go. A
 * chrome that takes a bar away from the page's side widens the viewport before the bar
 * has left, and the page laid out across the wider viewport would reach past the screen's
 * edge, under the bar, until it had.
 * @returns What gives the page back the viewport's width, once, however often it is called.
 */
function pinPageWidth(): () => void {
  const root = document.documentElement
  const width = root.style.width
  root.style.width = `${String(root.getBoundingClientRect().width)}px`
  let isPinned = true
  return () => {
    if (!isPinned) {
      return
    }
    isPinned = false
    root.style.width = width
  }
}

/**
 * Measures the element's place and pins it, and the page's width, before the chrome
 * hears anything, because the place is sized against the viewport and the chrome is about
 * to resize it. Pinned, the place keeps the size it had, so nothing under it moves and
 * the element lands back in it. The runtime alone knows the sizes, so they are the styles
 * written here.
 * @param element The element, in its place.
 * @returns The work in hand, or undefined for an element with no parent to hold its place.
 */
function pinPlace(element: HTMLElement): Lift | undefined {
  const parent = element.parentElement
  if (parent === null) {
    return undefined
  }
  const lift: Lift = {
    cancelHold: waitingForNothing,
    cancelTravel: waitingForNothing,
    cancelWait: waitingForNothing,
    elementMinHeight: element.style.minHeight,
    inert: [],
    parentMinHeight: parent.style.minHeight,
    place: placeOf(element, parent),
    scrollY: window.scrollY,
    unpinPage: pinPageWidth(),
  }
  element.style.minHeight = `${String(lift.place.height)}px`
  parent.style.minHeight = `${String(parent.getBoundingClientRect().height)}px`
  return lift
}

/**
 * One end of a move – where the element is, and how round its corners are there.
 */
interface Stop<TBox> {
  /**
   * Where the element is.
   */
  readonly box: TBox
  /**
   * The element's corner rounding there.
   */
  readonly radius: string
}

/**
 * Moves the element from one box to another, with its corners going from one rounding
 * to the other. A chrome can still move the viewport while the element travels, so each
 * resize starts the rest of the way again from wherever the element is then, towards
 * where the target is now – the path bends rather than the element jumping at the end.
 * @param element The element, in the top layer.
 * @param lift The work in hand, which takes the cancel.
 * @param from Where the element starts.
 * @param to Where the element ends, read again on every resize.
 * @param onFinish What follows once the element is there.
 */
function travel(
  element: HTMLElement,
  lift: Lift,
  from: Stop<Box>,
  to: Stop<() => Box>,
  onFinish: () => void,
): void {
  const startedAt = performance.now()
  let animation: Animation | undefined
  let frame = 0
  const stop = (): void => {
    cancelAnimationFrame(frame)
    removeEventListener("resize", onResize)
    visualViewport?.removeEventListener("resize", onResize)
  }
  const run = (box: Box, radius: string, length: number, easing: string): void => {
    animation = element.animate(
      [
        { borderRadius: radius, ...box },
        { borderRadius: to.radius, ...to.box() },
      ],
      { duration: length, easing },
    )
    // Only a finish lands it, because a cancel is a retarget or a component going away.
    animation.addEventListener("finish", () => {
      stop()
      onFinish()
    })
  }
  // Read in the next frame, once the layout the resize caused is there to measure.
  const retarget = (): void => {
    if (animation === undefined) {
      return
    }
    const rect = element.getBoundingClientRect()
    const radius = getComputedStyle(element).borderRadius
    animation.cancel()
    const left = Math.max(duration - (performance.now() - startedAt), 0)
    run(boxOver(rect), radius, left, "ease-out")
  }
  function onResize(): void {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(retarget)
  }
  addEventListener("resize", onResize)
  visualViewport?.addEventListener("resize", onResize)
  run(from.box, from.radius, duration, "ease")
  lift.cancelTravel = () => {
    stop()
    animation?.cancel()
  }
}

/**
 * Lifts the element out of its place into the top layer and grows it to fill the screen,
 * from where its place is now – measured against the parent, which stays in the page,
 * because the viewport may have moved under the page while the chrome took its bars away.
 * @param element The element, still in its place.
 * @param lift The work in hand, which knows the place and takes what was changed.
 */
function liftOut(element: HTMLElement, lift: Lift): void {
  const parent = element.parentElement
  if (parent === null) {
    return
  }
  const from = rectOf(lift.place, parent)
  element.showPopover()
  // What the stylesheet keeps clear of the screen's edges, set apart from the top layer so
  // it can ease in as the element grows and out as it shrinks, rather than switching at
  // either end.
  element.dataset["fillsScreen"] = ""
  lift.inert = inertBehind(element)
  // The page takes the viewport's width once the element covers all of it, so the page
  // laying itself out again is never seen.
  if (isMotionReduced()) {
    lift.unpinPage()
    return
  }
  travel(
    element,
    lift,
    { box: boxOver(from), radius: lift.place.radius },
    { box: () => screenBox, radius: "0px" },
    lift.unpinPage,
  )
}

/**
 * Keeps the element over the screen it covered while the chrome brings its bars back,
 * frame by frame until cancelled. A chrome that brings bars back moves the viewport
 * under a page it keeps still, so a fixed element at the viewport's edges would jump by
 * a bar's height; the parent stays with the page, so how far it moved in the viewport is
 * how far the old screen did.
 * @param element The element, filling the screen.
 * @param screen Where the element covered the screen, in the viewport as it was then.
 * @returns What says where the old screen is in the viewport now, and a cancel.
 */
function holdOverScreen(
  element: HTMLElement,
  screen: DOMRect,
): { readonly cancel: () => void; readonly screenNow: () => DOMRect } {
  const parent = element.parentElement
  const anchor = parent?.getBoundingClientRect().top ?? 0
  const screenNow = (): DOMRect => {
    const shift = (parent?.getBoundingClientRect().top ?? anchor) - anchor
    return new DOMRect(screen.left, screen.top + shift, screen.width, screen.height)
  }
  let frame = 0
  // Each frame runs after the resize and the scroll the chrome caused and before they
  // are drawn, so the element never shows a frame at the moved edges. The runtime alone
  // knows the shift, so it is a style written here, and the landing removes it.
  const hold = (): void => {
    placeBox(element, boxOver(screenNow()))
    frame = requestAnimationFrame(hold)
  }
  frame = requestAnimationFrame(hold)
  return {
    cancel: () => {
      cancelAnimationFrame(frame)
    },
    screenNow,
  }
}

/**
 * Shrinks the element from the screen it covered back over its place, wherever the page
 * has its place now.
 * @param element The element, filling the screen.
 * @param lift The work in hand, which knows where the element sat.
 * @param from Where the screen the element covered is in the viewport now.
 * @param onLanded What puts the element back in its place once it is over it.
 */
function shrinkBack(element: HTMLElement, lift: Lift, from: DOMRect, onLanded: () => void): void {
  const parent = element.parentElement
  delete element.dataset["fillsScreen"]
  if (parent === null || isMotionReduced()) {
    onLanded()
    return
  }
  travel(
    element,
    lift,
    { box: boxOver(from), radius: "0px" },
    { box: () => boxOver(rectOf(lift.place, parent)), radius: lift.place.radius },
    onLanded,
  )
}

/**
 * Holds the element over the screen it covered while the chrome brings its bars back,
 * and shrinks it back over its place once they are. The page goes back to where the
 * element left it first, where the chrome did not quite keep it still, so the element
 * lands in place.
 * @param element The element, filling the screen, with the declaration just withdrawn.
 * @param lift The work in hand, which takes the hold and the wait.
 * @param onLanded What puts the element back in its place once it is over it.
 */
function shrinkOnceBarsAreBack(element: HTMLElement, lift: Lift, onLanded: () => void): void {
  // Measured before the chrome hears anything, while the element still covers the whole
  // screen.
  const hold = holdOverScreen(element, element.getBoundingClientRect())
  lift.cancelHold = hold.cancel
  lift.cancelWait = whenScreenSettles(() => {
    const from = hold.screenNow()
    hold.cancel()
    if (Math.abs(window.scrollY - lift.scrollY) >= 1) {
      window.scrollTo({ behavior: "instant", top: lift.scrollY })
    }
    shrinkBack(element, lift, from, onLanded)
  })
}

/**
 * Undoes everything a lift changed – the wait, the hold, the animation, the inert page,
 * the top layer, and the pinned sizes and width.
 * @param element The element.
 * @param lift The work to undo.
 */
function undo(element: HTMLElement | null, lift: Lift): void {
  lift.cancelWait()
  lift.cancelHold()
  lift.cancelTravel()
  lift.unpinPage()
  for (const inert of lift.inert) {
    inert.inert = false
  }
  if (element === null) {
    return
  }
  if (element.matches(":popover-open")) {
    element.hidePopover()
  }
  delete element.dataset["fillsScreen"]
  placeBox(element, undefined)
  element.style.minHeight = lift.elementMinHeight
  if (element.parentElement !== null) {
    element.parentElement.style.minHeight = lift.parentMinHeight
  }
}

/**
 * Lets a manual popover grow from where it sits in the page to fill the screen, and
 * shrink back. The element stays where it is in the tree the whole time, so nothing in it
 * is rebuilt; the top layer lifts it over everything, and its stylesheet decides how it
 * looks in each place. Escape and a shell's back shrink it back as well, and while it
 * fills the screen everything behind it is inert.
 *
 * Full screen is declared before the element grows, and each animation is measured only
 * once the chrome has finished moving the viewport in answer, so the element grows from
 * exactly where it sat and lands exactly back in it. A chrome that keeps the page still
 * until the element has landed hears the declaration withdrawn after the shrink; any other
 * hears it before.
 * @param ref The element, carrying `popover="manual"`.
 * @returns Whether it fills the screen, the switch, and where the switch goes.
 */
export function useFullScreen(ref: RefObject<HTMLElement | null>): FullScreen {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [fillsScreen, setFillsScreen] = useState(false)
  const toggleControl = useRef<HTMLButtonElement | null>(null)
  const liftRef = useRef<Lift>(undefined)
  // Asks the chrome how it brings its bars back, known only once the declaration is made.
  const landsFirstRef = useRef<() => boolean>(undefined)
  // Which way the element is going, so a second press, Escape, or back while it is on its
  // way is read against where it is headed rather than against the last render.
  const headingRef = useRef<"place" | "screen">("place")

  const registerToggle = useCallback((control: HTMLButtonElement | null) => {
    toggleControl.current = control
  }, [])

  const land = useCallback(() => {
    const lift = liftRef.current
    liftRef.current = undefined
    if (lift !== undefined) {
      undo(ref.current, lift)
    }
    setIsFullScreen(false)
  }, [ref])

  const enter = useCallback(() => {
    const element = ref.current
    // Still shrinking back, the element has its place to reach before it can leave it.
    if (element === null || headingRef.current === "screen" || liftRef.current !== undefined) {
      return
    }
    const lift = pinPlace(element)
    if (lift === undefined) {
      return
    }
    headingRef.current = "screen"
    liftRef.current = lift
    setFillsScreen(true)
    lift.cancelWait = whenScreenSettles(() => {
      if (liftRef.current !== lift) {
        return
      }
      liftOut(element, lift)
      setIsFullScreen(true)
      toggleControl.current?.focus({ preventScroll: true })
    })
  }, [ref])

  const leave = useCallback(() => {
    if (headingRef.current === "place") {
      return
    }
    headingRef.current = "place"
    const element = ref.current
    const lift = liftRef.current
    // Still waiting for the viewport to grow, the element never left its place.
    if (element === null || lift === undefined || !element.matches(":popover-open")) {
      setFillsScreen(false)
      land()
      return
    }
    lift.cancelTravel()
    const finish = (): void => {
      if (liftRef.current !== lift) {
        return
      }
      // The focus goes back to the toggle only from inside the element, or from the
      // document, where hiding what held it leaves it.
      const active = document.activeElement
      const wasFocusInside = active === null || active === document.body || element.contains(active)
      land()
      if (wasFocusInside) {
        toggleControl.current?.focus({ preventScroll: true })
      }
    }
    if (landsFirstRef.current?.() === true) {
      // The page under the element stays where it is until the declaration goes, so the
      // place is where it is now, and the bars come back over the page once it has landed.
      shrinkBack(element, lift, element.getBoundingClientRect(), () => {
        finish()
        setFillsScreen(false)
      })
      return
    }
    setFillsScreen(false)
    shrinkOnceBarsAreBack(element, lift, finish)
  }, [land, ref])
  const landsFirst = useDeclareFullScreen(fillsScreen, leave)
  useLayoutEffect(() => {
    landsFirstRef.current = landsFirst
  }, [landsFirst])

  // A component that goes away mid-way leaves nothing inert, pinned, or waiting.
  useEffect(
    () => () => {
      const lift = liftRef.current
      liftRef.current = undefined
      if (lift !== undefined) {
        undo(ref.current, lift)
      }
    },
    [ref],
  )

  useEscape(isFullScreen, leave)

  const toggle = useCallback(() => {
    if (headingRef.current === "screen") {
      leave()
    } else {
      enter()
    }
  }, [enter, leave])

  return { isFullScreen, registerToggle, toggle }
}
