import type { ReactElement } from "react"

/**
 * How many are picked, and where they can go.
 */
export interface SelectionBarProps {
  /**
   * How many people are picked.
   */
  readonly count: number
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
 * that takes them out of their patrols. It stays at the bottom of the screen, so the
 * patrols can be scrolled to under it.
 * @param props The count, the patrols, and what the buttons do.
 * @returns The bar.
 */
export function SelectionBar(props: SelectionBarProps): ReactElement {
  const { count, onClear, onMove, patrols } = props
  return (
    <div aria-label="Valda" className="patrols-selection" role="region">
      <strong className="patrols-selection-count">
        {count === 1 ? "1 vald" : `${String(count)} valda`}
      </strong>
      <button className="patrols-selection-clear" onClick={onClear} type="button">
        Avmarkera
      </button>
      <div className="patrols-selection-moves">
        {patrols.map((name, index) => (
          <button
            className="patrols-selection-move"
            // Keyed by place, as the patrols are.
            key={`move-${String(index)}`}
            onClick={() => {
              onMove(index)
            }}
            type="button"
          >
            Till {name}
          </button>
        ))}
        <button
          className="patrols-selection-move patrols-selection-out"
          onClick={() => {
            onMove(undefined)
          }}
          type="button"
        >
          Ur patrull
        </button>
      </div>
    </div>
  )
}
