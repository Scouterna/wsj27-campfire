import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { PersonCasesScreen } from "./PersonCasesScreen"

/**
 * The screen with the router attached, handing the address's parameter to the screen as
 * an ordinary prop so a story can render it with no router underneath.
 * @returns The screen, for the person the address names.
 */
export function PersonCasesRoute(): ReactElement {
  const { memberNo } = useParams({ from: "/cases/person/$memberNo" })
  return <PersonCasesScreen memberNo={memberNo} />
}
