import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A gender outside female and male: the transgender sign, a circle with the Venus cross
 * below it, the Mars arrow to the right, and a struck arrow to the left. The circle is
 * kept small so the arms are long enough to hold the strike clear of the arrowhead, where
 * it would otherwise read as a second one.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function GenderOtherIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <circle key="ring" cx="12" cy="13" r="3.2" />,
      <path key="stem" d="M12 16.2V22" />,
      <path key="bar" d="M9.7 19.3h4.6" />,
      <path key="right-shaft" d="M14.3 10.7 20.5 4.5" />,
      <path key="right-head" d="M17.5 4.5h3v3" />,
      <path key="left-shaft" d="M9.7 10.7 3.5 4.5" />,
      <path key="left-head" d="M6.5 4.5h-3v3" />,
      <path key="left-strike" d="m6 9.5 3-3" />,
    ],
    props,
  )
}
