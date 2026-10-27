import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A hand raised, palm out – the gesture for "I'll take it".
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function HandIcon(props: IconProps): ReactElement {
  return stroke(
    <>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 11V4a1.5 1.5 0 0 1 3 0v7" />
      <path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 10a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-5-2.4L4.3 15.8a1.6 1.6 0 0 1 2.5-2L8 15.2V12" />
    </>,
    props,
  )
}
