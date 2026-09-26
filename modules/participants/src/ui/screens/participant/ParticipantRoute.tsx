import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { ParticipantScreen } from "./ParticipantScreen"

/**
 * The screen with the router attached. It reads the address's parameter and hands it to
 * the screen as an ordinary prop, so a story, or another screen, can render the screen
 * with no router underneath it.
 * @returns The screen, asking after whoever the address names.
 */
export function ParticipantRoute(): ReactElement {
  const { memberNo } = useParams({ from: "/participants/$memberNo" })
  return <ParticipantScreen memberNo={memberNo} />
}
