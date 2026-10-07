import type { Theme } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Frame } from "../../../model/social/Frame"
import { addedTextsKeyOf, frames } from "../../../model/social/frames"
import type { PlacedText } from "../../../model/social/placement"
import { FrameThumbnail } from "./FrameThumbnail"
import { noFrame, noTexts, untouched } from "./untouched"

import "./FrameChoice.css"

/**
 * What the reader can pick between: no frame first, then every frame the graphic profile
 * offers.
 */
export const frameOptions: readonly (Frame | undefined)[] = [undefined, ...frames]

export interface FrameChoiceProps {
  /**
   * The chosen frame, or undefined for none.
   */
  readonly current: Frame | undefined
  /**
   * The mark drawn where a frame leaves room for one, or undefined to draw none.
   */
  readonly markUrl: string | undefined
  /**
   * Fires with the frame the reader picked, or undefined for none.
   */
  readonly onPick: (frame: Frame | undefined) => void
  /**
   * The reader's photo, decoded, or undefined before one is chosen.
   */
  readonly photo: ImageBitmap | undefined
  /**
   * The texts the reader has added, by the name each picture keeps them under.
   */
  readonly placed: ReadonlyMap<string, readonly PlacedText[]>
  /**
   * What the reader wrote in each frame's fixed slots, by frame id and then slot id.
   */
  readonly texts: ReadonlyMap<string, Readonly<Record<string, string>>>
  /**
   * The color to draw the frames in.
   */
  readonly theme: Theme
}

/**
 * The picture without a frame and in every frame the graphic profile offers, with the one
 * in use marked.
 * @param props The photo and what each frame is drawn with, the chosen frame, and what
 * picking one does.
 * @returns The grid.
 */
export function FrameChoice(props: FrameChoiceProps): ReactElement {
  return (
    <div aria-label="Ramar" className="frame-choice" role="group">
      {frameOptions.map((frame) => {
        const key = frame?.id ?? noFrame
        return (
          <FrameThumbnail
            frame={frame}
            isCurrent={frame?.id === props.current?.id}
            key={key}
            markUrl={props.markUrl}
            onPick={() => {
              props.onPick(frame)
            }}
            photo={props.photo}
            placed={props.placed.get(addedTextsKeyOf(frame)) ?? noTexts}
            texts={props.texts.get(key) ?? untouched}
            theme={props.theme}
          />
        )
      })}
    </div>
  )
}
