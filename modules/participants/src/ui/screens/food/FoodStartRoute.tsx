import type { ReactElement } from "react"

import { useViewer } from "../../../data/viewer"
import { FoodScreen } from "./FoodScreen"
import { FoodUnitsScreen } from "./FoodUnitsScreen"
import { useOpenRows } from "./use-open-rows"

/**
 * The section's start: every numbered unit for the health team, who may read any of them,
 * and a leader's own unit's overview straight away, because it is the only one they may
 * read.
 * @returns The screen for the reader.
 */
export function FoodStartRoute(): ReactElement {
  const viewer = useViewer()
  const { onToggle, open } = useOpenRows()

  if (viewer.readsEveryone && viewer.readsHealth) {
    return <FoodUnitsScreen />
  }
  // A reader who leads no unit names none, which the overview refuses.
  const unit = viewer.unitNumber === undefined ? "" : String(viewer.unitNumber)
  return <FoodScreen onToggle={onToggle} open={open} unit={unit} />
}
