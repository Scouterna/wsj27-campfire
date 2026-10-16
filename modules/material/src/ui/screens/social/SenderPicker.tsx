import type { Theme } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { MarkPicker, type Mark } from "./MarkPicker"
import { ThemePicker } from "./ThemePicker"

export interface SenderPickerProps {
  /**
   * The color an image from the contingent is drawn in.
   */
  readonly color: Theme
  /**
   * Who the image is for.
   */
  readonly mark: Mark
  /**
   * Fires with the color that was picked.
   */
  readonly onColor: (color: Theme) => void
  /**
   * Fires with who the image is now for.
   */
  readonly onMark: (mark: Mark) => void
  /**
   * Whether the units may be offered by name, which they may not before the units reveal.
   */
  readonly showUnits: boolean
}

/**
 * Who the contingent management's image is for, and, only for the contingent itself,
 * which has no color of its own, the color it is drawn in.
 * @param props Who the image is for, its color, and what picking either does.
 * @returns The controls.
 */
export function SenderPicker(props: SenderPickerProps): ReactElement {
  return (
    <>
      <MarkPicker current={props.mark} onPick={props.onMark} showUnits={props.showUnits} />
      {props.mark === "contingent" ? (
        <div className="social-color">
          <p className="social-color-label">Färg</p>
          <ThemePicker current={props.color} onPick={props.onColor} />
        </div>
      ) : null}
    </>
  )
}
