import { themes, type Theme } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { themeNames } from "./theme-names"

export interface ThemePickerProps {
  /**
   * The color in force.
   */
  readonly current: Theme
  /**
   * Fires with the color that was picked.
   */
  readonly onPick: (theme: Theme) => void
}

/**
 * The five colors, as discs named for assistive technology.
 *
 * Shown only for an image the contingent itself is sending. A unit wears one of the five
 * and its material is in that one, so a unit's frames have no color to choose – but the
 * contingent is all five and none of them, and which one an image wants is the sender's
 * decision rather than a fact anybody can look up.
 *
 * Each swatch carries its own `data-theme`, so the color it shows is the one the design
 * system already defines for that name rather than a second list of hex codes kept in
 * step by hand.
 *
 * @param props The color in force, and what picking one does.
 * @returns The control.
 */
export function ThemePicker(props: ThemePickerProps): ReactElement {
  return (
    <div aria-label="Färg" className="theme-picker" role="group">
      {themes.map((theme) => (
        <button
          aria-pressed={theme === props.current}
          className="theme-swatch"
          data-theme={theme}
          key={theme}
          onClick={() => {
            props.onPick(theme)
          }}
          type="button"
        >
          <span className="theme-swatch-mark" />
          {/* eslint-disable-next-line security/detect-object-injection -- the key is one of the five theme names the design system itself lists */}
          <span className="theme-swatch-name">{themeNames[theme]}</span>
        </button>
      ))}
    </div>
  )
}
