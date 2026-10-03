import {
  RotateLeftIcon,
  RotateRightIcon,
  TextLargerIcon,
  TextSmallerIcon,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { resized, turned, type Placement, type TextColor } from "../../../model/social/placement"
import { TextColorTool } from "./TextColorTool"
import type { LaidText } from "./use-placed-texts"
import { sizeStep } from "./use-text-gestures"

export interface TextToolbarProps {
  /**
   * Whether a text can be added, which takes a photo to add it to.
   */
  readonly canAdd: boolean
  /**
   * Adds a text.
   */
  readonly onAdd: () => void
  /**
   * Takes the color picked for the selected text.
   */
  readonly onColor: (color: TextColor) => void
  /**
   * Takes the placement a tool leaves for the selected text.
   */
  readonly onPlace: (next: Placement) => void
  /**
   * The selected text, laid out, or undefined while none is – which leaves the tools
   * that act on it unavailable.
   */
  readonly selected: LaidText | undefined
  /**
   * The color the picture is themed in, the third color a text can be set in.
   */
  readonly theme: Theme
}

/**
 * The tools over the picture: adding a text, and sizing, turning, and coloring the
 * selected one.
 * @param props Whether a text can be added, the selected text, and what each tool does.
 * @returns The toolbar.
 */
export function TextToolbar(props: TextToolbarProps): ReactElement {
  const { selected } = props
  const isIdle = selected === undefined
  const apply = (change: (text: LaidText) => Placement): void => {
    if (selected !== undefined) {
      props.onPlace(change(selected))
    }
  }

  return (
    <div aria-label="Text" className="text-toolbar" role="toolbar">
      <button
        className="text-tool text-tool-add"
        disabled={!props.canAdd}
        onClick={props.onAdd}
        type="button"
      >
        Lägg till text
      </button>
      <TextColorTool current={selected?.color} onColor={props.onColor} theme={props.theme} />
      <span className="text-tool-group">
        <button
          aria-label="Mindre text"
          className="text-tool"
          disabled={isIdle}
          onClick={() => {
            apply((text) => resized(text.placement, text.size, 1 / sizeStep))
          }}
          type="button"
        >
          <span aria-hidden="true" className="text-tool-icon">
            <TextSmallerIcon size={20} strokeWidth={2} />
          </span>
        </button>
        <button
          aria-label="Större text"
          className="text-tool"
          disabled={isIdle}
          onClick={() => {
            apply((text) => resized(text.placement, text.size, sizeStep))
          }}
          type="button"
        >
          <span aria-hidden="true" className="text-tool-icon">
            <TextLargerIcon size={20} strokeWidth={2} />
          </span>
        </button>
      </span>
      <span className="text-tool-group">
        <button
          aria-label="Vrid åt vänster"
          className="text-tool"
          disabled={isIdle}
          onClick={() => {
            apply((text) => turned(text.placement, -1))
          }}
          type="button"
        >
          <span aria-hidden="true" className="text-tool-icon">
            <RotateLeftIcon size={20} strokeWidth={2} />
          </span>
        </button>
        <button
          aria-label="Vrid åt höger"
          className="text-tool"
          disabled={isIdle}
          onClick={() => {
            apply((text) => turned(text.placement, 1))
          }}
          type="button"
        >
          <span aria-hidden="true" className="text-tool-icon">
            <RotateRightIcon size={20} strokeWidth={2} />
          </span>
        </button>
      </span>
    </div>
  )
}
