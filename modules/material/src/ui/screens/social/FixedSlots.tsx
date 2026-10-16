import type { ReactElement } from "react"

import type { Frame, TextSlot } from "../../../model/social/Frame"
import { SlotOverlay, type SlotOverlayProps } from "./SlotOverlay"
import { promptShare } from "./use-placed-texts"

export interface FixedSlotsProps {
  /**
   * The frame whose slots these are.
   */
  readonly frame: Frame
  /**
   * Fires with every text in the frame's fixed slots as it is now, on every key.
   */
  readonly onTexts: (texts: Readonly<Record<string, string>>) => void
  /**
   * The size each slot's text was last drawn at, as a share of the picture's height, by
   * slot id – missing for a slot left empty.
   */
  readonly sizes: Readonly<Record<string, number>>
  /**
   * What the reader wrote in the frame's fixed slots, by slot id.
   */
  readonly texts: Readonly<Record<string, string>>
}

/**
 * The fields for the frame's slots that stay put, each on the slot it fills.
 * @param props The frame, its text, the sizes it was drawn at, and what typing does.
 * @returns The fields.
 */
export function FixedSlots(props: FixedSlotsProps): ReactElement {
  const { frame, onTexts, sizes, texts } = props
  return (
    <>
      {frame.slots
        .filter((slot) => !slot.isMovable)
        .map((slot) => (
          <SlotOverlay
            isPressable
            key={`${frame.id}-${slot.id}`}
            onText={(next) => {
              onTexts({ ...texts, [slot.id]: next })
            }}
            place={fixedPlace(slot, sizes[slot.id])}
            slot={slot}
            value={texts[slot.id] ?? ""}
          />
        ))}
    </>
  )
}

/**
 * Where a slot that stays put has its field: on the slot's own box, turned with it, at
 * the size its text was last drawn at, or the prompt's size while it is empty.
 * @param slot the slot
 * @param size the size its text was last drawn at, if it has any
 * @returns The field's place.
 */
function fixedPlace(slot: TextSlot, size: number | undefined): SlotOverlayProps["place"] {
  return {
    angle: slot.angle,
    height: slot.box.height,
    size: size ?? slot.maxSize * promptShare,
    width: slot.box.width,
    x: slot.box.x + slot.box.width / 2,
    y: slot.box.y + slot.box.height / 2,
  }
}
