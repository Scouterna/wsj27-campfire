import { Card, PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

/**
 * The start screen's placeholder content. The title is a static välkommen on purpose –
 * no name (they run long) and no clock – and the wording is the home feature's to
 * revisit, along with the card the placeholder lines sit on.
 *
 * @returns The screen.
 */
export function HomeScreen(): ReactElement {
  return (
    <>
      <PageTitle title="Välkommen" />
      <Card>
        <p>Sidan kommer snart.</p>
      </Card>
    </>
  )
}
