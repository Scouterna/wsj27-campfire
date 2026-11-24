import { useId, type ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A picture struck through: the picture's frame, sun, and hills, cut clear around a
 * rising diagonal, for pictures that may not be shown.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PictureOffIcon(props: IconProps): ReactElement {
  // A mask rather than strokes broken by hand, so the picture keeps the plain icon's exact
  // lines. The id is per instance, because a page draws many and an id is the document's.
  const mask = useId()
  const slash = "M20 4 4 20"
  return stroke(
    <>
      <defs>
        <mask height="24" id={mask} maskUnits="userSpaceOnUse" width="24" x="0" y="0">
          <rect fill="#fff" height="24" width="24" />
          <path d={slash} stroke="#000" strokeWidth="4" />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <rect height="14" rx="3" width="18" x="3" y="5" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="m5 18 5-5 3 3 3-3 3 3" />
      </g>
      <path d={slash} />
    </>,
    props,
  )
}
