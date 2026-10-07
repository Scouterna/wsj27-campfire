import type { ReactElement } from "react"

import { useTheme } from "../../foundations/theme/ThemeProvider"
import { contingentMark } from "./marks"

import "./Logo.css"

export type LogoProps = {
  /**
   * Replaces the full alt text where the context already says what the mark is.
   */
  readonly alt?: string
}

/**
 * The contingent's logotype, in the theme's color. One component owns the assets and
 * the alt text, so every surface shows the same mark and no screen reaches for a loose
 * image path.
 *
 * @param props The alt text to use instead of the full one.
 * @returns The mark.
 */
export function Logo(props: LogoProps): ReactElement {
  const theme = useTheme()

  return (
    <img
      className="logo"
      src={contingentMark(theme)}
      alt={props.alt ?? "26th World Scout Jamboree Poland 2027 – Swedish Contingent"}
    />
  )
}
