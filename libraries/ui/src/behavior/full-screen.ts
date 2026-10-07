import { useLayoutEffect, useSyncExternalStore } from "react"

/**
 * Whether the current page has something filling the screen, how the chrome brings its
 * bars back, and who is listening. Module state, because the declaring page and the
 * reading chrome sit on opposite sides of the router's outlet.
 */
const state: {
  dismiss: (() => void) | undefined
  isFullScreen: boolean
  isLandingFirst: boolean
} = {
  dismiss: undefined,
  isFullScreen: false,
  isLandingFirst: false,
}
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function isFullScreenSnapshot(): boolean {
  return state.isFullScreen
}

function setFullScreen(isFullScreen: boolean): void {
  if (state.isFullScreen === isFullScreen) {
    return
  }
  state.isFullScreen = isFullScreen
  for (const listener of listeners) {
    listener()
  }
}

/**
 * Declares from anywhere in a page whether something in it fills the screen, for a
 * chrome that draws bars over the page to take them away. The declaration is withdrawn
 * on unmount, so a page left while filling the screen leaves no bars hidden.
 *
 * @param isFullScreen whether the page fills the screen now
 * @param onDismiss what returns the page from filling the screen, which a back gesture
 *   calls in place of leaving the page
 * @returns What says, when asked on the way back, whether the chrome brings its bars back
 *   only after what filled the screen is back in its place. Such a chrome keeps the page
 *   still meanwhile, so the declaration stays until the page has shrunk it back. Otherwise
 *   the declaration is withdrawn first, and the bars come back while it still covers the
 *   screen.
 */
export function useDeclareFullScreen(isFullScreen: boolean, onDismiss: () => void): () => boolean {
  useLayoutEffect(() => {
    state.dismiss = isFullScreen ? onDismiss : undefined
    setFullScreen(isFullScreen)
    return () => {
      state.dismiss = undefined
      setFullScreen(false)
    }
  }, [isFullScreen, onDismiss])
  return isLandingFirst
}

function isLandingFirst(): boolean {
  return state.isLandingFirst
}

/**
 * Returns the page from filling the screen, for a back gesture, which on a native
 * full-screen layer closes the layer rather than the page beneath it.
 *
 * @returns Whether something filled the screen and was asked to stop, in which case the
 *   back is spent.
 */
// Named for what it does, which is the caller's reason to call it; the answer says only
// whether it did.
// eslint-disable-next-line unicorn/consistent-boolean-name -- see above
export function dismissFullScreen(): boolean {
  const dismiss = state.dismiss
  if (dismiss === undefined) {
    return false
  }
  dismiss()
  return true
}

/**
 * The longest a chrome is given to start moving the viewport. A shell answers a
 * declaration with a resize several hundred milliseconds later on a busy phone, and
 * anything measured before it lands is measured in a geometry about to be replaced.
 */
const settleLimit = 800

/**
 * Stands in for a wait that never started, so there is always something to cancel.
 */
function waitedForNothing(): void {
  // Nothing waited, so nothing is cancelled.
}

/**
 * Calls back once the viewport has stopped moving after a full-screen declaration, so
 * whatever is measured then is measured in the geometry the screen keeps. A chrome that
 * answers a declaration by taking its bars away resizes the viewport some time later,
 * and a rectangle measured before that is off by a bar's height.
 *
 * The viewport has settled once two frames pass without a resize or a scroll after the
 * first one. A scroll counts, because a chrome that moves the document under the page
 * moves the viewport's origin with it, and does so in steps a resize alone can miss.
 * A chrome that never resizes is given up on after a limit, and with no chrome listening
 * to the declaration at all, as in the browser, the callback runs at once.
 *
 * @param onSettled what to measure and animate once the viewport is still
 * @returns A cancel, which keeps `onSettled` from running, for a component that goes away
 *   while it waits.
 */
export function whenScreenSettles(onSettled: () => void): () => void {
  if (listeners.size === 0) {
    onSettled()
    return waitedForNothing
  }
  const viewport = visualViewport
  let frame = 0
  const settle = (): void => {
    stop()
    onSettled()
  }
  const onMove = (): void => {
    cancelAnimationFrame(frame)
    // Two frames, so the layout the move caused has been drawn before it is measured.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(settle)
    })
  }
  const limit = setTimeout(settle, settleLimit)
  function stop(): void {
    cancelAnimationFrame(frame)
    clearTimeout(limit)
    removeEventListener("resize", onMove)
    removeEventListener("scroll", onMove)
    viewport?.removeEventListener("resize", onMove)
  }
  addEventListener("resize", onMove)
  addEventListener("scroll", onMove)
  viewport?.addEventListener("resize", onMove)
  return stop
}

/**
 * Whether the page declared that something in it fills the screen. Reading it marks the
 * reader as a chrome that moves the viewport in answer, which `whenScreenSettles` then
 * waits for.
 *
 * @param isLandingFirst whether the chrome brings its bars back only once what filled
 *   the screen is back in its place, over a page it keeps still, rather than at once
 * @returns The declaration, re-rendering the caller whenever it changes.
 */
export function useIsFullScreen(isLandingFirst = false): boolean {
  useLayoutEffect(() => {
    state.isLandingFirst = isLandingFirst
  }, [isLandingFirst])
  return useSyncExternalStore(subscribe, isFullScreenSnapshot)
}
