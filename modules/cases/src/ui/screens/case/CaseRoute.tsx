import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { CaseScreen } from "./CaseScreen"

/**
 * The screen with the router attached. It reads the address's parameter and hands it to
 * the screen as an ordinary prop, so a story can render the screen with no router
 * underneath it.
 * @returns The screen, for the case the address names.
 */
export function CaseRoute(): ReactElement {
  const { caseId } = useParams({ from: "/cases/$caseId" })
  return <CaseScreen caseId={caseId} />
}
