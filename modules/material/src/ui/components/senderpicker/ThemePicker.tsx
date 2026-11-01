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
 * The colors, as discs named for assistive technology.
 *
 * Each swatch carries its own `data-theme`, so the color it shows is the one the design
 * system defines for that name rather than a second list of hex codes.
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
          {/* eslint-disable-next-line security/detect-object-injection -- a Theme, never free input */}
          <span className="theme-swatch-name">{themeNames[theme]}</span>
        </button>
      ))}
    </div>
  )
}
