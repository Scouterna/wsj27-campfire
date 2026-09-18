import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { UnitScreen } from "./UnitScreen"

/**
 * The route that answers at `/participants/units/$unit`: it reads the entry's key out of
 * the address and hands it to the screen.
 *
 * The split is what lets the screen be rendered outside the application – in the catalog,
 * where there is no route to read a parameter from.
 * @returns The screen, for the entry the address names.
 */
export function UnitRoute(): ReactElement {
  const { unit } = useParams({ from: "/participants/units/$unit" })

  return <UnitScreen entryKey={unit} />
}
