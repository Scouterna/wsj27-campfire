import type { WidgetFrom } from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useRef, type ReactElement } from "react"

import { CountdownCard } from "./CountdownCard"
import { useIsMediaMatched } from "./use-is-media-matched"
import { useIsOnScreen } from "./use-is-on-screen"
import { useNow } from "./use-now"

declare module "@scouterna/wsj27-campfire-ui" {
  interface WidgetRegistry {
    /**
     * Where the contingent is on the journey to Gdańsk, counted for the signed-in
     * person's own dates.
     */
    "journey:countdown": WidgetFrom<"journey">
  }
}

/**
 * The countdown card on the clock, counted to the signed-in person's own travel choice.
 * The clock runs to the second in the wide layout, and to the minute on a phone or under
 * reduced motion, because a figure changing every second is motion too. It stops while
 * nobody can see the card, so a countdown a year long costs no battery it does not have
 * to. The dates are the module's own, so it needs no network and never loads.
 *
 * @returns The card, on the clock.
 */
export function CountdownWidget(): ReactElement {
  const travel = useUser()?.travel
  const isWide = useIsMediaMatched("(min-width: 768px)")
  const isStill = useIsMediaMatched("(prefers-reduced-motion: reduce)")
  const hasSeconds = isWide && !isStill
  const card = useRef<HTMLDivElement>(null)
  const isOnScreen = useIsOnScreen(card)
  const now = useNow(hasSeconds ? 1000 : 60_000, isOnScreen)

  return (
    // The card takes no ref, so the element the clock watches is the widget's own.
    <div ref={card}>
      <CountdownCard now={now} seconds={hasSeconds} travel={travel} />
    </div>
  )
}
