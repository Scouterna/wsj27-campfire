import type { ReactElement } from "react"

import type { IconProps } from "./IconProps"

import "./icons.css"

/**
 * The shared frame every stroked icon draws in: a 24-point box, filling its container,
 * colored by the surrounding text. Width and height are emitted only when a size is
 * asked for, so an icon left unsized still stretches to the box around it.
 * @param children The icon's strokes, drawn on the 24-point grid.
 * @param props The size and line weight asked for.
 * @returns The framed icon.
 */
export function stroke(
  children: ReactElement | readonly ReactElement[],
  props: IconProps = {},
): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={props.size}
      height={props.size}
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
