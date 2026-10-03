import { Card, type Theme } from "@scouterna/wsj27-campfire-ui"
import { useMemo, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react"

import type { Frame } from "../../../model/social/Frame"
import { addedSlotOf } from "../../../model/social/frames"
import type { PlacedText } from "../../../model/social/placement"
import { DownloadAction } from "./DownloadAction"
import { frameOptions } from "./FrameChoice"
import { FrameStage } from "./FrameStage"
import { TextToolbar } from "./TextToolbar"
import { useDrawnScene } from "./use-drawn-scene"
import { usePlacedTexts } from "./use-placed-texts"

import "./FrameEditor.css"

export interface FrameEditorProps {
  /**
   * The frames to choose between, beside the picture where there is room and under it
   * where there is not.
   */
  readonly choice: ReactNode
  /**
   * The chosen frame, or undefined for none.
   */
  readonly frame: Frame | undefined
  /**
   * Whether a photo is being decoded, which takes a moment for a large one off a phone.
   */
  readonly isReading: boolean
  /**
   * The mark drawn where the frame leaves room for one, or undefined to draw none.
   */
  readonly markUrl: string | undefined
  /**
   * Fires when the reader asks to choose a photo, or another one.
   */
  readonly onChoosePhoto: () => void
  /**
   * Fires with every added text as it is after a change.
   */
  readonly onPlaced: (placed: readonly PlacedText[]) => void
  /**
   * Fires with every text in the chosen frame's fixed slots as it is now, on every key.
   */
  readonly onTexts: (texts: Readonly<Record<string, string>>) => void
  /**
   * The reader's photo, decoded, or undefined before one is chosen.
   */
  readonly photo: ImageBitmap | undefined
  /**
   * The texts the reader has added to the picture as it is framed now.
   */
  readonly placed: readonly PlacedText[]
  /**
   * The controls for who the image is for, in a card of their own under the picture,
   * since they change the frame's color and mark. Left out for a reader whose unit
   * settles it.
   */
  readonly sender?: ReactNode
  /**
   * What the reader wrote in the chosen frame's fixed slots, by slot id.
   */
  readonly texts: Readonly<Record<string, string>>
  /**
   * The color to draw the frame in.
   */
  readonly theme: Theme
}

/**
 * The whole image maker, laid out once and filled in as the reader goes: the tools for
 * the text, the picture with its text written on it, the frames, and the download as the
 * page's primary action.
 *
 * Everything is there from the start, so nothing moves when a photo or a frame is chosen,
 * and a photo needs no frame at all. The picture is the finished image itself, drawn at
 * full size and shown smaller, so the download is the canvas the reader is looking at.
 * @param props The photo, the frame, the color, the mark, the text, and what changing
 * them does.
 * @returns The editor.
 */
export function FrameEditor(props: FrameEditorProps): ReactElement {
  const { frame, markUrl, photo, placed, texts, theme } = props
  const canvas = useRef<HTMLCanvasElement>(null)

  const scene = useMemo(
    () => ({ frame, markUrl, photo, placed, texts, theme }),
    [frame, markUrl, photo, placed, texts, theme],
  )
  const { hasFailed, isDrawn, sizes } = useDrawnScene(canvas, scene)
  const slot = addedSlotOf(frame)
  const added = usePlacedTexts(slot, placed, sizes, props.onPlaced)
  const selected = added.laid.find((text) => text.id === added.selected)

  return (
    // The editor carries the frame's color, so the rings and the focus are the color
    // being previewed rather than the one the application is dressed in.
    <div
      className="frame-editor"
      data-frame={frame?.id}
      data-theme={theme}
      // How many frames share the picture's height where they stand beside it, which the
      // layout sizes their column by.
      style={{ "--frame-count": frameOptions.length } as CSSProperties}
    >
      <div className="frame-editor-layout">
        <div className="frame-editor-tools">
          <TextToolbar
            canAdd={photo !== undefined}
            onAdd={added.add}
            onColor={(color) => {
              if (selected !== undefined) {
                added.recolor(selected.id, color)
              }
            }}
            onPlace={(next) => {
              if (selected !== undefined) {
                added.place(selected.id, next)
              }
            }}
            selected={selected}
            theme={theme}
          />
        </div>

        <div className="frame-editor-picture">
          <h2 className="frame-editor-heading">Bild</h2>
          <FrameStage
            added={added}
            canvas={canvas}
            frame={frame}
            isReading={props.isReading}
            onChoosePhoto={props.onChoosePhoto}
            onTexts={props.onTexts}
            photo={photo}
            sizes={sizes}
            slot={slot}
            texts={texts}
          />
        </div>

        <div className="frame-editor-frames">
          <h2 className="frame-editor-heading">Ram</h2>
          {props.choice}
        </div>

        <div className="frame-editor-form">
          {props.sender === undefined ? null : <Card title="Avsändare">{props.sender}</Card>}
          <DownloadAction
            canvas={canvas}
            frame={frame}
            isComplete={photo !== undefined && isDrawn}
          />
          {hasFailed ? (
            <p className="frame-error" role="status">
              Ramen kunde inte ritas.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
