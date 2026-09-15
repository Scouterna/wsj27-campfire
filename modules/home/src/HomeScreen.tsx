import { Button } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import "./HomeScreen.css"

// Home never imports authentication – the greeted name and the sign-out behavior are
// facts authentication holds, and they cross as props from the composition root.
export type HomeScreenProps = {
  /**
   * The first name the page greets.
   */
  readonly firstName: string
  /**
   * What the sign-out action does – the address belongs to authentication, so the
   * application hands the behavior in.
   */
  readonly onSignOut: () => void
}

/**
 * The signed-in application, for now: a greeting page with no chrome and no navigation
 * around it.
 *
 * @param props The first name to greet, and what the sign-out action does.
 * @returns The screen.
 */
export function HomeScreen(props: HomeScreenProps): ReactElement {
  return (
    <section className="home-screen">
      <h1>Hej {props.firstName}!</h1>
      <Button label="Logga ut" onPress={props.onSignOut} />
    </section>
  )
}
