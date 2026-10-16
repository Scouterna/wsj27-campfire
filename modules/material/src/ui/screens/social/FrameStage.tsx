import type { ReactElement, RefObject } from "react"

import { exportSize, type Frame, type TextSlot } from "../../../model/social/Frame"
import { FixedSlots } from "./FixedSlots"
import { PhotoPrompt } from "./PhotoPrompt"
import { RemoveButton } from "./RemoveButton"
import { SlotOverlay } from "./SlotOverlay"
import type { PlacedTexts } from "./use-placed-texts"
import { useTextGestures } from "./use-text-gestures"

export interface FrameStageProps {
  /**
   * The texts the reader has added, and what can be done with them.
   */
  readonly added: PlacedTexts
  /**
   * The canvas the picture is drawn on, owned by the editor that draws it.
   */
  readonly canvas: RefObject<HTMLCanvasElement | null>
  /**
   * The chosen frame, or undefined for none.
   */
  readonly frame: Frame | undefined
  /**
   * Whether a photo is being decoded, which takes a moment for a large one off a phone.
   */
  readonly isReading: boolean
  /**
   * Fires when the reader asks to choose a photo, or another one.
   */
  readonly onChoosePhoto: () => void
  /**
   * Fires with every text in the frame's fixed slots as it is now, on every key.
   */
  readonly onTexts: (texts: Readonly<Record<string, string>>) => void
  /**
   * The reader's photo, decoded, or undefined before one is chosen.
   */
  readonly photo: ImageBitmap | undefined
  /**
   * The size each fixed slot's text was last drawn at, as a share of the picture's
   * height, by slot id – missing for a slot left empty.
   */
  readonly sizes: Readonly<Record<string, number>>
  /**
   * The slot added texts go in.
   */
  readonly slot: TextSlot
  /**
   * What the reader wrote in the frame's fixed slots, by slot id.
   */
  readonly texts: Readonly<Record<string, string>>
}

/**
 * The picture, with the fields for its text laid over it where the text goes.
 *
 * Added text is dragged anywhere on the picture and tapped to be written in, so a drag
 * never lands in a field by mistake. Before there is a photo the picture says what the
 * screen makes and offers to choose one.
 * @param props The canvas, the photo, the frame, its text, and what changing them does.
 * @returns The picture.
 */
export function FrameStage(props: FrameStageProps): ReactElement {
  const { added, canvas, frame, isReading, onChoosePhoto, photo, slot } = props
  const { onKeyDown, ...pointing } = useTextGestures({
    hit: added.hit,
    onPlace: added.place,
    onRemove: added.remove,
    onSelect: added.select,
    onTap: added.onTap,
    selected: added.selected,
    texts: added.laid,
  })
  const hasText = photo !== undefined && added.laid.length > 0
  const chosen = added.laid.find((text) => text.id === added.selected)

  return (
    <div
      className={hasText ? "frame-stage frame-stage-placeable" : "frame-stage"}
      {...(hasText && pointing)}
    >
      <canvas
        aria-label={pictureLabel(frame, photo !== undefined, hasText)}
        className="frame-canvas"
        ref={canvas}
        role="img"
        {...(hasText && { onKeyDown, tabIndex: 0 })}
      />
      {frame === undefined || photo === undefined ? null : (
        <FixedSlots frame={frame} onTexts={props.onTexts} sizes={props.sizes} texts={props.texts} />
      )}
      {photo === undefined
        ? null
        : added.laid.map((text, index) => (
            <SlotOverlay
              fieldRef={added.fieldOf(text.id)}
              isFresh={added.fresh === text.id}
              isPressable={added.editing === text.id}
              isSelected={added.selected === text.id}
              key={text.id}
              label={`Text ${String(index + 1)}`}
              onEditing={(isEditing) => {
                added.onEditing(text.id, isEditing)
              }}
              onText={(next) => {
                added.write(text.id, next)
              }}
              place={{
                ...text.placement,
                height: text.extent.height / exportSize.height,
                size: text.size,
                width: text.extent.width / exportSize.width,
              }}
              slot={slot}
              value={text.text}
            />
          ))}
      {chosen === undefined || !hasText ? null : (
        <RemoveButton
          extent={chosen.extent}
          label="Ta bort texten"
          onRemove={() => {
            added.remove(chosen.id)
          }}
          placement={chosen.placement}
        />
      )}
      {photo === undefined ? (
        <PhotoPrompt isReading={isReading} onChoose={onChoosePhoto} />
      ) : (
        <button className="frame-glass frame-change" onClick={onChoosePhoto} type="button">
          Byt bild
        </button>
      )}
    </div>
  )
}

/**
 * What the picture is, read out in place of it.
 * @param frame the chosen frame, if any
 * @param hasPhoto whether there is a photo in it
 * @param canPlace whether it has text that can be moved
 * @returns The label.
 */
function pictureLabel(frame: Frame | undefined, hasPhoto: boolean, canPlace: boolean): string {
  if (frame === undefined) {
    return hasPhoto ? "Din bild, utan ram" : "Ingen bild än"
  }
  const shown = hasPhoto ? `${frame.label} med din bild` : `${frame.label} utan bild`
  return canPlace
    ? `${shown}. Flytta den valda texten med piltangenterna, ändra storleken med plus och minus, vrid den med hakparenteserna och ta bort den med Delete.`
    : shown
}
