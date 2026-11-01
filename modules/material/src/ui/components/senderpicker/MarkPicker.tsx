import { unitName, unitNumbers } from "@scouterna/wsj27-campfire-ui"
import type { ChangeEvent, ReactElement } from "react"

/**
 * What the frames are being made for: the contingent itself, or one of its units.
 *
 * A unit is its number; the contingent is the absence of one.
 */
export type Mark = number | "contingent"

export interface MarkPickerProps {
  /**
   * The choice in force.
   */
  readonly current: Mark
  /**
   * Fires with what was picked.
   */
  readonly onPick: (mark: Mark) => void
  /**
   * Whether the units may be offered by name. Before the units reveal they may not, and
   * the contingent is the only choice.
   */
  readonly showUnits: boolean
}

/**
 * Who the image is for: the contingent, or a unit.
 *
 * A native select, because every unit is too long a list for a control of our own, and
 * the platform's already works with a keyboard, a screen reader, and a thumb.
 * @param props The choice in force, whether units may be listed, and what picking does.
 * @returns The control.
 */
export function MarkPicker(props: MarkPickerProps): ReactElement {
  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value
    props.onPick(value === "contingent" ? "contingent" : Number(value))
  }

  return (
    <label className="mark-picker">
      <span className="mark-picker-label">Vem är bilden för?</span>
      <select className="mark-picker-select" onChange={onChange} value={String(props.current)}>
        <option value="contingent">Kontingenten</option>
        {props.showUnits
          ? unitNumbers.map((unitNumber) => (
              <option key={unitNumber} value={unitNumber}>
                {unitNumber} · {unitName(unitNumber) ?? "Avdelning"}
              </option>
            ))
          : null}
      </select>
    </label>
  )
}
