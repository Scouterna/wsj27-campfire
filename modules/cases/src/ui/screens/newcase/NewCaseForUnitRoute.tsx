import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { NewCaseScreen } from "./NewCaseScreen"

/**
 * The form with the router attached and the unit already chosen as what the case is
 * about – the one the address's parameter names. An address naming no unit by its
 * number starts with the search, as the plain form does.
 * @returns The form.
 */
export function NewCaseForUnitRoute(): ReactElement {
  const { unitNumber } = useParams({ from: "/cases/new/unit/$unitNumber" })
  return /^[1-9]\d*$/u.test(unitNumber) ? (
    <NewCaseScreen unitNumber={Number(unitNumber)} />
  ) : (
    <NewCaseScreen />
  )
}
