import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { NewCaseScreen } from "./NewCaseScreen"

/**
 * The form with the router attached and the person already chosen – the one the
 * address's parameter names.
 * @returns The form.
 */
export function NewCaseForPersonRoute(): ReactElement {
  const { memberNo } = useParams({ from: "/cases/new/$memberNo" })
  return <NewCaseScreen memberNo={memberNo} />
}
