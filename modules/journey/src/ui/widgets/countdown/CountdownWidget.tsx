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
 * Where the contingent is on the journey to Gdańsk – the card the home screen places,
 * whoever is signed in. The widget is the card on the clock: it reads the moment and
 * hands it to `CountdownCard`, which draws it. The clock runs to the second where the
 * wide layout has the room for it, and to the minute on a phone – and for somebody who
 * has asked for reduced motion, because a figure changing every second is motion too.
 * The clock stops while nobody can see the card – scrolled out of view, in a background
 * tab, in a shell that has been put away – so a countdown a year long costs no battery
 * it does not have to, and it catches up the moment the card is back. The dates are the
 * module's own, so it needs no network and never loads.
 *
 * Whose dates it counts to it reads from the signed-in person: the rundresa and the
 * direktresa each start the journey at their own departure, one through Latvia and
 * Lithuania and the other to Olsztyn. For everybody else the journey is the camp – an
 * unknown travel choice included, so nobody is put on a bus they did not book.
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
