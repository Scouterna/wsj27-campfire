import type { TextSlot } from "./Frame"

/**
 * The face every text in a frame is set in – the contingent's display face, which is
 * what the graphic profile letters its own material in.
 */
export const textFace = '"Bravely Script", cursive'

/**
 * How far apart the lines of a block are, as a multiple of the text's size.
 */
export const lineHeight = 1.15

/**
 * How wide a line is when set at a size, in pixels.
 */
export type Measure = (line: string, size: number) => number

/**
 * The lines a reader's text is set in. A slot that holds one line gets one, whatever was
 * typed into it. A block keeps every line as typed, blank ones too, so a return opens its
 * new line on the picture at once, where the field being typed in has put the caret.
 * @param text what the reader typed
 * @param slot the slot it is set in
 * @returns The lines, empty when there is nothing but space to draw.
 */
export function linesOf(text: string, slot: TextSlot): readonly string[] {
  const trimmed = text.trim()
  if (trimmed === "") {
    return []
  }
  return slot.isMultiline ? text.split(/\r?\n/u).map((line) => line.trim()) : [trimmed]
}

/**
 * The size a text is set at so it fills its slot without spilling out of it: as large
 * as the slot's ceiling allows, then smaller until the widest line fits the width and
 * every line fits the height.
 *
 * A line's width grows in step with the size, so one measurement at the ceiling says
 * how far each line has to shrink.
 * @param lines the lines to set, at least one
 * @param slot the slot they go in
 * @param picture the picture's size in pixels
 * @param picture.height the picture's height
 * @param picture.width the picture's width
 * @param measure how wide a line is in the face it is drawn in
 * @returns The size in pixels.
 */
export function fitSize(
  lines: readonly string[],
  slot: TextSlot,
  picture: { readonly height: number; readonly width: number },
  measure: Measure,
): number {
  const ceiling = slot.maxSize * picture.height
  const byHeight = (slot.box.height * picture.height) / (lines.length * lineHeight)
  const room = slot.box.width * picture.width
  const byWidth = Math.min(
    ...lines.map((line) => {
      const width = measure(line, ceiling)
      return width === 0 ? ceiling : (ceiling * room) / width
    }),
  )
  return Math.min(ceiling, byHeight, byWidth)
}
