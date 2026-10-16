import type { CSSProperties, ReactElement, Ref } from "react"

import type { TextSlot } from "../../../model/social/Frame"

export interface SlotOverlayProps {
  /**
   * The field itself, for the picture to focus when its text is tapped.
   */
  readonly fieldRef?: Ref<HTMLInputElement & HTMLTextAreaElement>
  /**
   * Whether the field opens itself to be written in as it appears – a text just added.
   */
  readonly isFresh?: boolean
  /**
   * Whether the field answers presses. Movable text is dragged until it is tapped, and
   * only then takes presses as a field.
   */
  readonly isPressable: boolean
  /**
   * Whether the field's text is the one the handles and the keys act on, which shows its
   * outline while it is not being written in.
   */
  readonly isSelected?: boolean
  /**
   * What the field is called, where the slot's own name would not tell several apart.
   */
  readonly label?: string
  /**
   * Fires when the field gains or loses focus.
   */
  readonly onEditing?: (isEditing: boolean) => void
  /**
   * Fires with the text as it is now, on every key.
   */
  readonly onText: (text: string) => void
  /**
   * Where the field sits and how large its text is, as shares of the picture: its middle,
   * its width and height, its turn in degrees, and its text's size as a share of the
   * picture's height.
   */
  readonly place: {
    readonly angle: number
    readonly height: number
    readonly size: number
    readonly width: number
    readonly x: number
    readonly y: number
  }
  /**
   * The slot the field fills, which names it and decides whether it takes several lines.
   */
  readonly slot: TextSlot
  /**
   * The text in the field.
   */
  readonly value: string
}

/**
 * The field for one of a frame's text slots, laid over the picture where its text is
 * drawn, in the same face and size, turned with it.
 *
 * The field's own letters are clear and only its caret and selection show, because the
 * picture underneath draws the text as it will be downloaded – a second copy in the
 * browser's own rendering could only disagree with it.
 * @param props The slot, its text, where it sits, and what typing does.
 * @returns The field.
 */
export function SlotOverlay(props: SlotOverlayProps): ReactElement {
  const { place, slot } = props
  // The place is measured off the artwork and the text, so it is handed to the
  // stylesheet rather than written into it.
  const style = {
    "--angle": place.angle,
    "--height": place.height,
    "--size": place.size,
    "--width": place.width,
    "--x": place.x,
    "--y": place.y,
  } as CSSProperties
  const shared = {
    "aria-label": props.label ?? slot.label,
    // A text just added opens itself, because the reader asked for the field by pressing
    // the button that adds it.
    autoFocus: props.isFresh === true,
    className: [
      "frame-slot",
      props.isPressable ? undefined : "frame-slot-held",
      props.isSelected === true ? "frame-slot-selected" : undefined,
    ]
      .filter((name) => name !== undefined)
      .join(" "),
    onBlur: () => props.onEditing?.(false),
    onFocus: () => props.onEditing?.(true),
    placeholder: "Skriv här",
    ...(props.fieldRef !== undefined && { ref: props.fieldRef }),
    spellCheck: false,
    style,
    value: props.value,
  }

  return slot.isMultiline ? (
    <textarea
      {...shared}
      onChange={(event) => {
        props.onText(event.target.value)
      }}
      rows={1}
    />
  ) : (
    <input
      {...shared}
      onChange={(event) => {
        props.onText(event.target.value)
      }}
      type="text"
    />
  )
}
