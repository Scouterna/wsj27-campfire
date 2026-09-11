import { Logo } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

/**
 * The home screen: where anyone signed in lands.
 *
 * @returns The screen.
 */
export function HomeScreen(): ReactElement {
  return (
    <section>
      <Logo name="Campfire" compact />
      <h1>Hem</h1>
    </section>
  )
}
