/**
 * Which way the next navigation moves, as the stylesheet reads it. `forward` and `back`
 * slide, `fade` cross-fades between sections, and `none` disarms the animation for a
 * change something else already animated.
 */
export type NavDirection = "forward" | "back" | "fade" | "none"

/**
 * Declare which way the next navigation moves. The direction is a `data-nav` attribute
 * on the root element, read by the application's stylesheet while the view transition
 * runs. A function rather than the attribute itself, so the contract has one typed side.
 * @param direction The direction the next navigation animates in.
 */
export function setNavDirection(direction: NavDirection): void {
  document.documentElement.dataset["nav"] = direction
}

// Whether the next history pop is one the application asked for. A pop that arrives
// without the flag is the platform's own gesture – the iOS edge swipe, the browser's
// back button – which has already animated itself, and running a slide on top of it
// would animate the same navigation twice.
const popState = { expected: false }

/**
 * Mark the next history pop as deliberately ours, so it keeps its view transition. Call
 * it immediately before going back; a pop without it gets no animation, which is the
 * failure mode that reads as "the transition just does not fire here".
 */
export function expectPop(): void {
  popState.expected = true
}

/**
 * Whether the pop now arriving was asked for, clearing the mark either way – so a mark
 * left by a pop that never came cannot arm the one after it.
 * @returns True when the pop was asked for.
 */
export function wasPopExpected(): boolean {
  const { expected } = popState
  popState.expected = false
  return expected
}
