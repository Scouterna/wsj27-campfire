import { Logo } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

/**
 * The journey screen: the trip, from the first meeting to the flight home.
 *
 * @returns The screen.
 */
export function JourneyScreen(): ReactElement {
  return (
    <section>
      <Logo />
      <h1>Resan</h1>
    </section>
  )
}
