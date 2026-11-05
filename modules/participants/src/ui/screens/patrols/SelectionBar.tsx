import { Button, Card } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import "./SelectionBar.css"

/**
 * How many are picked, and where they can go.
 */
export interface SelectionBarProps {
  /**
   * Whether a move would move anybody, for a patrol by its place, or out of their patrols
   * for undefined.
   */
  readonly canMove: (index: number | undefined) => boolean
  /**
   * How many people are picked.
   */
  readonly count: number
  /**
   * Whether the page's floating save button sits beside the bar, so the bar can leave
   * it room.
   */
  readonly isBesideSave: boolean
  /**
   * Lets everybody go.
   */
  readonly onClear: () => void
  /**
   * Moves everybody picked to a patrol by its place, or out of their patrols for
   * undefined.
   */
  readonly onMove: (index: number | undefined) => void
  /**
   * What each patrol is called, in place order.
   */
  readonly patrols: readonly string[]
}

/**
 * The bar that follows the reader while people are picked: how many, one button that
 * lets them go, and a button for each patrol that moves them all there at once, with one
 * that takes them out of their patrols. A move that would move nobody is left out rather
 * than pressed to no effect. The screen keeps it at the foot of the view, so the patrols
 * can be scrolled to under it.
 * @param props The count, the patrols, and what the buttons do.
 * @returns The bar.
 */
export function SelectionBar(props: SelectionBarProps): ReactElement {
  const { canMove, count, isBesideSave, onClear, onMove, patrols } = props
  return (
    <div
      aria-label="Valda"
      className={
        isBesideSave ? "patrols-selection patrols-selection-beside-save" : "patrols-selection"
      }
      role="region"
    >
      <Card>
        <div className="patrols-selection-head">
          <strong>{count === 1 ? "1 vald" : `${String(count)} valda`}</strong>
          <Button label="Avmarkera" onPress={onClear} variant="plain" />
        </div>
        <div className="patrols-selection-moves">
          {patrols.map((name, index) =>
            canMove(index) ? (
              <Button
                // Keyed by place, as the patrols are.
                key={`move-${String(index)}`}
                label={`Till ${name}`}
                onPress={() => {
                  onMove(index)
                }}
                variant="secondary"
              />
            ) : null,
          )}
          {canMove(undefined) && (
            <Button
              label="Ur patrullen"
              onPress={() => {
                onMove(undefined)
              }}
              variant="plain"
            />
          )}
        </div>
      </Card>
    </div>
  )
}
