import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { FoodScreen } from "./FoodScreen"
import { useOpenRows } from "./use-open-rows"

/**
 * One unit's overview with the router attached. It reads the unit and the expanded rows
 * out of the address and hands them to the screen as ordinary props, so a story can render
 * the screen with no router underneath it.
 * @returns The screen, for the unit the address names.
 */
export function FoodRoute(): ReactElement {
  const { unit } = useParams({ from: "/food/$unit" })
  const { onToggle, open } = useOpenRows()

  return <FoodScreen onToggle={onToggle} open={open} unit={unit} />
}
