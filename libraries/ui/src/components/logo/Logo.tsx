import type { ReactElement } from "react"

import blueLogoUrl from "../../../assets/images/logo-blue.svg"
import brownLogoUrl from "../../../assets/images/logo-brown.svg"
import greenLogoUrl from "../../../assets/images/logo-green.svg"
import redLogoUrl from "../../../assets/images/logo-red.svg"
import yellowLogoUrl from "../../../assets/images/logo-yellow.svg"
import type { Theme } from "../../foundations/theme/Theme"
import { useTheme } from "../../foundations/theme/ThemeProvider"

import "./Logo.css"

/**
 * The contingent's mark in each theme's color: the wordmark on a plate in the theme's
 * ink. One file per theme rather than one file, because the mark loads as an `<img>`
 * and cannot read the ink token from CSS.
 */
const logos: Readonly<Record<Theme, string>> = {
  blue: blueLogoUrl,
  brown: brownLogoUrl,
  green: greenLogoUrl,
  red: redLogoUrl,
  yellow: yellowLogoUrl,
}

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
      // The key is one of the five literals the type allows, not anything data-driven.
      // eslint-disable-next-line security/detect-object-injection -- key is a checked literal
      src={logos[theme]}
      alt={props.alt ?? "26th World Scout Jamboree Poland 2027 – Swedish Contingent"}
    />
  )
}
