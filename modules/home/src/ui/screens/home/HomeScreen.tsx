import { PageTitle, unitsReveal } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement, ReactNode } from "react"

import { RevealWidget } from "../../widgets/reveal/RevealWidget"

export type HomeScreenProps = {
  /**
   * What the composition root places on the start screen – other modules' widgets,
   * each already gated by whatever reveal governs it. Home only places them, and
   * never learns which module they came from.
   */
  readonly widget?: ReactNode
}

/**
 * The start screen: every pending reveal counting down, then the widgets the
 * composition root hands in – a start screen earns its content a widget at a time.
 * An open reveal's countdown stands down live at its moment, and what it opened
 * takes the room. The title is a static välkommen on purpose – no name (they run
 * long) and no clock – and the wording is the home feature's to revisit.
 *
 * @param props The widgets the composition root places here.
 * @returns The screen.
 */
export function HomeScreen(props: HomeScreenProps): ReactElement {
  return (
    <>
      <PageTitle title="Välkommen" />
      <RevealWidget reveal={unitsReveal} />
      {props.widget}
    </>
  )
}
