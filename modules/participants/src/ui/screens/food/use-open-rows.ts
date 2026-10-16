import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"

import { toFoodSearch, toggled, type RowKey } from "./search"

/**
 * The rows left expanded, and the way to toggle one.
 */
export interface OpenRows {
  /**
   * Expands the row, or collapses it.
   */
  readonly onToggle: (key: RowKey) => void
  /**
   * The keys of the expanded rows.
   */
  readonly open: readonly RowKey[]
}

/**
 * The overview's expanded rows, kept in the address it is shown at.
 *
 * A toggle replaces the address rather than pushing one, so back leaves the overview
 * rather than closing rows – and the rows live in the address at all so a pop from a
 * person's page redraws the overview at the height it was left, which is what lets the
 * scroll be restored to where the reader was.
 * @returns The expanded rows, and the way to toggle one.
 */
export function useOpenRows(): OpenRows {
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const open = useMemo(() => toFoodSearch(location.search).open ?? [], [location.search])
  const pathname = location.pathname

  const onToggle = useCallback(
    (key: RowKey): void => {
      // The router scrolls to the top after every navigation, which would throw the
      // reader away from the row they just opened.
      void navigate({
        replace: true,
        resetScroll: false,
        search: toggled(open, key),
        to: pathname,
        viewTransition: false,
      })
    },
    [navigate, open, pathname],
  )

  return { onToggle, open }
}
