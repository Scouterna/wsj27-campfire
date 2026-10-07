import { useUnitIdentities } from "@scouterna/wsj27-campfire-ui"
import type { ChangeEvent, ReactElement } from "react"

/**
 * What the frames are being made for: the contingent itself, or one of its units.
 *
 * A unit is its number; the contingent is the absence of one. The choice decides both
 * the mark in the corner and the color of the frames, because those are one fact about a
 * unit rather than two – a unit's material is in the unit's own color.
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
 * Only the contingent management sees this. Everybody else belongs to a unit, and their
 * frames come in that unit's color with that unit's mark – there is nothing to choose.
 * The management belongs to no unit, and is usually making something *about* one.
 *
 * A native select rather than a control of our own: fifty-six choices is a list, and the
 * platform's own list is the one that already works with a keyboard, a screen reader, and
 * a thumb on a phone.
 *
 * @param props The choice in force, whether units may be listed, and what picking does.
 * @returns The control.
 */
export function MarkPicker(props: MarkPickerProps): ReactElement {
  const identities = useUnitIdentities()

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
          ? identities.numbers.map((unitNumber) => (
              <option key={unitNumber} value={unitNumber}>
                {unitNumber} · {identities.name(unitNumber) ?? "Avdelning"}
              </option>
            ))
          : null}
      </select>
    </label>
  )
}
