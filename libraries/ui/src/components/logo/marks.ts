import blueLogoUrl from "../../../assets/images/logo-blue.svg"
import brownLogoUrl from "../../../assets/images/logo-brown.svg"
import greenLogoUrl from "../../../assets/images/logo-green.svg"
import redLogoUrl from "../../../assets/images/logo-red.svg"
import yellowLogoUrl from "../../../assets/images/logo-yellow.svg"
import type { Theme } from "../../foundations/theme/Theme"

/**
 * The contingent's mark in each theme's color: the wordmark on a plate in the theme's
 * ink. One file per theme rather than one file, because the mark loads as an `<img>` and
 * cannot read the ink token from CSS.
 */
const logos: Readonly<Record<Theme, string>> = {
  blue: blueLogoUrl,
  brown: brownLogoUrl,
  green: greenLogoUrl,
  red: redLogoUrl,
  yellow: yellowLogoUrl,
}

/**
 * Where the contingent's mark is served in a theme's color.
 *
 * The `Logo` component is how a screen shows the mark; this is for the rare caller that
 * needs the address itself – drawing the mark onto a canvas, where there is no element to
 * render. Reach for `Logo` unless you are one of those.
 * @param theme The color to fetch it in.
 * @returns The address.
 */
export function contingentMark(theme: Theme): string {
  // eslint-disable-next-line security/detect-object-injection -- a Theme, never free input
  return logos[theme]
}
