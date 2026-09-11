import { Logo } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

/**
 * The sign-in screen: where anyone who is not signed in lands.
 *
 * @returns The screen.
 */
export function SignInScreen(): ReactElement {
  return (
    <section>
      <Logo name="Campfire" compact />
      <h1>Logga in</h1>
    </section>
  )
}
