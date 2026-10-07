import { CloseIcon } from "@scouterna/wsj27-campfire-ui"
import type { CSSProperties, ReactElement } from "react"

import { cornerOf, type Extent, type Placement } from "../../../model/social/placement"

export interface RemoveButtonProps {
  /**
   * How wide and high the text's box is, in the finished image's pixels.
   */
  readonly extent: Extent
  /**
   * What the button is called, naming the text it removes.
   */
  readonly label: string
  /**
   * Removes the text.
   */
  readonly onRemove: () => void
  /**
   * Where the text is now.
   */
  readonly placement: Placement
}

/**
 * The button at the upper right corner of a selected added text, which removes it.
 * @param props Where the text is, how large its box is, and what pressing does.
 * @returns The button.
 */
export function RemoveButton(props: RemoveButtonProps): ReactElement {
  const corner = cornerOf(props.placement, props.extent, { x: 1, y: -1 })
  const style = { "--x": corner.x, "--y": corner.y } as CSSProperties

  return (
    <button
      aria-label={props.label}
      className="frame-remove"
      onClick={props.onRemove}
      style={style}
      type="button"
    >
      <CloseIcon size={14} strokeWidth={2.4} />
    </button>
  )
}
