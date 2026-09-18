import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { ParticipantScreen } from "./ParticipantScreen"

/**
 * The screen with the router attached.
 *
 * Reads the address's parameter and hands it to the screen as an ordinary prop, which is
 * what lets `ParticipantScreen` be rendered by a story, or by another screen, with no
 * router underneath it.
 * @returns The screen, asking after whoever the address names.
 */
export function ParticipantRoute(): ReactElement {
  const { memberNo } = useParams({ from: "/participants/$memberNo" })
  return <ParticipantScreen memberNo={memberNo} />
}
