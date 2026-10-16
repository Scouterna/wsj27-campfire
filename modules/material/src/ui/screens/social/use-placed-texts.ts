import { useRef, useState } from "react"

import { exportSize, type TextSlot } from "../../../model/social/Frame"
import {
  addedPlacement,
  isOnText,
  type Extent,
  type PlacedText,
  type Placement,
  type Point,
  type TextColor,
} from "../../../model/social/placement"
import { lineHeight, linesOf } from "../../../model/social/text"
import type { MovableText } from "./use-text-gestures"

/**
 * An added text as the picture lays it out: where it is, the size it is drawn at as a
 * share of the picture's height, how large its box is, and its color.
 */
export interface LaidText extends MovableText {
  readonly color: TextColor
  readonly extent: Extent
  readonly text: string
}

/**
 * The added texts on a picture, and what the reader is doing with them.
 */
export interface PlacedTexts {
  /**
   * Adds an empty text, in the color last picked, and opens it to be written in.
   */
  readonly add: () => void
  /**
   * The text being written in, if any.
   */
  readonly editing: string | undefined
  /**
   * Keeps a text's field, so a tap on the text can open it.
   */
  readonly fieldOf: (id: string) => (field: HTMLElement | null) => void
  /**
   * The text just added, which opens itself to be written in.
   */
  readonly fresh: string | undefined
  /**
   * Which text is under a point on the finished image, the topmost where they overlap.
   */
  readonly hit: (point: Point) => string | undefined
  /**
   * Every added text, laid out.
   */
  readonly laid: readonly LaidText[]
  /**
   * Tells the texts that one has begun or stopped being written in. One left empty when
   * it stops is removed.
   */
  readonly onEditing: (id: string, isEditing: boolean) => void
  /**
   * Answers a tap: opens the text it landed on, or lets go of every text.
   */
  readonly onTap: (id: string | undefined) => void
  /**
   * Moves, sizes, or turns one text.
   */
  readonly place: (id: string, next: Placement) => void
  /**
   * Sets one text in another color.
   */
  readonly recolor: (id: string, color: TextColor) => void
  /**
   * Removes one text.
   */
  readonly remove: (id: string) => void
  /**
   * Selects one text, for the keys and the handles.
   */
  readonly select: (id: string | undefined) => void
  /**
   * The text the handles and the keys act on, if any.
   */
  readonly selected: string | undefined
  /**
   * Writes one text.
   */
  readonly write: (id: string, text: string) => void
}

/**
 * How large an empty slot's prompt is, as a share of its largest text, so it reads as a
 * prompt rather than as text already written.
 */
export const promptShare = 0.5

/**
 * The texts a reader adds to the picture, laid out on it, with which one is selected and
 * which is being written in.
 * @param slot the slot added texts go in
 * @param placed the texts added so far
 * @param sizes the size each text was last drawn at, by text id
 * @param onPlaced takes every text as it is after a change
 * @returns The texts, and what can be done with them.
 */
export function usePlacedTexts(
  slot: TextSlot,
  placed: readonly PlacedText[],
  sizes: Readonly<Record<string, number>>,
  onPlaced: (next: readonly PlacedText[]) => void,
): PlacedTexts {
  const [selected, setSelected] = useState<string>()
  const [editing, setEditing] = useState<string>()
  const [fresh, setFresh] = useState<string>()
  // The color last picked, which the next text added starts in.
  const [lastColor, setLastColor] = useState<TextColor>("white")
  const fields = useRef(new Map<string, HTMLElement>())
  // Counted rather than derived from the texts, so a removed text's id is never reused
  // for a new one while its field may still be on its way out.
  const count = useRef(placed.length)

  const laid = placed.map((text): LaidText => {
    const size = text.placement.size ?? sizes[text.id] ?? slot.maxSize * promptShare
    const lines = linesOf(text.text, slot).length
    return {
      ...text,
      extent: {
        height: Math.max(1, lines) * size * lineHeight * exportSize.height,
        width: slot.box.width * exportSize.width,
      },
      size,
    }
  })
  const change = (id: string, by: (text: PlacedText) => PlacedText): void => {
    onPlaced(placed.map((text) => (text.id === id ? by(text) : text)))
  }
  const remove = (id: string): void => {
    onPlaced(placed.filter((text) => text.id !== id))
    setSelected((current) => (current === id ? undefined : current))
  }

  return {
    add: () => {
      count.current += 1
      const id = `text-${String(count.current)}`
      onPlaced([
        ...placed,
        { color: lastColor, id, placement: addedPlacement(slot, placed.length), text: "" },
      ])
      setSelected(id)
      setFresh(id)
    },
    editing,
    fieldOf: (id) => (field) => {
      if (field === null) {
        fields.current.delete(id)
      } else {
        fields.current.set(id, field)
      }
    },
    fresh,
    hit: (point) => laid.findLast((text) => isOnText(text.placement, text.extent, point))?.id,
    laid,
    onEditing: (id, isEditing) => {
      if (isEditing) {
        setEditing(id)
        setSelected(id)
        return
      }
      setEditing(undefined)
      setFresh(undefined)
      if (placed.find((text) => text.id === id)?.text.trim() === "") {
        remove(id)
      }
    },
    onTap: (id) => {
      setSelected(id)
      if (id === undefined) {
        if (editing !== undefined) {
          fields.current.get(editing)?.blur()
        }
        return
      }
      fields.current.get(id)?.focus()
    },
    place: (id, next) => {
      change(id, (text) => ({ ...text, placement: next }))
    },
    recolor: (id, color) => {
      change(id, (text) => ({ ...text, color }))
      setLastColor(color)
    },
    remove,
    select: setSelected,
    selected,
    write: (id, next) => {
      change(id, (text) => ({ ...text, text: next }))
    },
  }
}
