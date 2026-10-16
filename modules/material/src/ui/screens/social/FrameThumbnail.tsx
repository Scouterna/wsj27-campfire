import type { Theme } from "@scouterna/wsj27-campfire-ui"
import { useMemo, useRef, type ReactElement } from "react"

import type { Frame } from "../../../model/social/Frame"
import type { PlacedText } from "../../../model/social/placement"
import { useDrawnScene } from "./use-drawn-scene"

export interface FrameThumbnailProps {
  /**
   * The frame this button picks, or undefined for the button that picks none.
   */
  readonly frame: Frame | undefined
  /**
   * Whether this is the frame the picture is in now.
   */
  readonly isCurrent: boolean
  /**
   * The mark drawn where the frame leaves room for one, or undefined to draw none.
   */
  readonly markUrl: string | undefined
  /**
   * Fires when the reader picks this frame.
   */
  readonly onPick: () => void
  /**
   * The reader's photo, decoded, or undefined before one is chosen.
   */
  readonly photo: ImageBitmap | undefined
  /**
   * The texts the reader has added to the picture in this frame.
   */
  readonly placed: readonly PlacedText[]
  /**
   * What the reader wrote in this frame, by slot id.
   */
  readonly texts: Readonly<Record<string, string>>
  /**
   * The color to draw the frame in.
   */
  readonly theme: Theme
}

/**
 * One frame to choose from, drawn with the reader's own photo and text so the choice is
 * between finished images rather than between names. Before there is a photo it is
 * drawn empty and cannot be picked, because a frame is chosen for a photo.
 * @param props The frame, what it is drawn with, whether it is in use, and what picking it
 * does.
 * @returns The button.
 */
export function FrameThumbnail(props: FrameThumbnailProps): ReactElement {
  const { frame, markUrl, photo, placed, texts, theme } = props
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useMemo(
    () => ({ frame, markUrl, photo, placed, texts, theme }),
    [frame, markUrl, photo, placed, texts, theme],
  )
  useDrawnScene(canvas, scene)

  return (
    <button
      aria-pressed={props.isCurrent}
      className="frame-thumbnail"
      data-theme={theme}
      disabled={photo === undefined}
      onClick={props.onPick}
      type="button"
    >
      <span className="frame-thumbnail-picture">
        <canvas aria-hidden="true" className="frame-thumbnail-canvas" ref={canvas} />
      </span>
      <span className="frame-thumbnail-name">{frame?.label ?? "Utan ram"}</span>
    </button>
  )
}
