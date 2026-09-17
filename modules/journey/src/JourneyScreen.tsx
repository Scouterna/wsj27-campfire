import { Card, PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

/**
 * The journey screen: the trip, from the first meeting to the flight home. A
 * placeholder until the journey feature lands.
 *
 * @returns The screen.
 */
export function JourneyScreen(): ReactElement {
  return (
    <>
      <PageTitle title="Resan" />
      <Card>
        <p>Sidan kommer snart.</p>
      </Card>
    </>
  )
}
