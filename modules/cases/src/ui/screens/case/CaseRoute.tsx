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
  // Keyed, so a move straight from one case to another starts the screen afresh rather
  // than carrying a draft, a chosen picture, or an open card across.
  return <CaseScreen caseId={caseId} key={caseId} />
}
