import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { UnitScreen } from "./UnitScreen"

/**
 * The screen with the router attached. It reads the entry's key out of the address and
 * hands it to the screen as an ordinary prop, so a story can render the screen with no
 * router underneath it.
 * @returns The screen, for the entry the address names.
 */
export function UnitRoute(): ReactElement {
  const { unit } = useParams({ from: "/participants/units/$unit" })

  return <UnitScreen entryKey={unit} />
}
