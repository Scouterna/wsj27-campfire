import { Countdown, useIsRevealed, type Reveal } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

/**
 * The reveal a countdown stands for.
 */
export interface RevealWidgetProps {
  /**
   * The reveal to count down – its moment and its words both come from the catalog.
   */
  readonly reveal: Reveal
}

/**
 * One pending reveal's countdown on the start screen. At its moment the widget stands
 * down live, and whatever the reveal opened takes the room.
 *
 * @param props The reveal to count down.
 * @returns The countdown, or nothing once the reveal is open.
 */
export function RevealWidget(props: RevealWidgetProps): ReactElement | null {
  const isOpen = useIsRevealed(props.reveal.id)
  if (isOpen) {
    return null
  }
  return (
    <Countdown
      at={props.reveal.at}
      hint={props.reveal.hint}
      label="Nedräkning till avslöjandet"
      overline={props.reveal.overline}
    />
  )
}
