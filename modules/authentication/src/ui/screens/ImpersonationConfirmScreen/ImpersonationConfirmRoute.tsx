import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { ImpersonationConfirmScreen } from "./ImpersonationConfirmScreen"

/**
 * The confirmation with the router attached – for the member the address's parameter
 * names.
 * @returns The confirmation.
 */
export function ImpersonationConfirmRoute(): ReactElement {
  const { memberNo } = useParams({ from: "/profile/impersonate/$memberNo" })
  return <ImpersonationConfirmScreen memberNo={memberNo} />
}
