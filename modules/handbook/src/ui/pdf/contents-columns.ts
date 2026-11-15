import type { ContentsLine } from "../../model/documents"
import { contentsLineHeight, contentsLook } from "./pdf-look"

/**
 * A line of the table of contents with the room it is counted as taking in its column.
 */
export interface ColumnLine {
  /**
   * The room the line is counted as taking, in points, the gap above it included – an
   * estimate on the generous side, since the line itself is as tall as its text.
   */
  readonly height: number
  readonly line: ContentsLine
}

/**
 * The room the columns of the table of contents have, in points.
 */
export interface ColumnRoom {
  /**
   * How tall a column on the first sheet is, under the heading.
   */
  readonly firstHeight: number
  /**
   * How tall a column on every later sheet is.
   */
  readonly height: number
  /**
   * How wide a column is.
   */
  readonly width: number
}

// The room a line's page number and the least of its dots take at its end.
const numberWidth = 30

// How wide the body face's letters run, as shares of the face's size: the narrow ones,
// the wide ones, capitals and digits, and the rest. Close enough to tell whether a title
// fits a row, which is all the columns need.
const narrow = new Set("fijlrtI .,:;!'()/-")
const wide = new Set("mwMW–—")

/**
 * How wide a title runs in the body face, about.
 * @param title The title, as it is set – in capitals where its line is.
 * @param fontSize The face's size, in points.
 * @returns The width, in points.
 */
function widthOf(title: string, fontSize: number): number {
  let width = 0
  for (const letter of title) {
    if (narrow.has(letter)) {
      width += 0.3
    } else if (wide.has(letter)) {
      width += 0.86
    } else if (letter === letter.toLocaleUpperCase("sv-SE")) {
      width += 0.7
    } else {
      width += 0.56
    }
  }
  return width * fontSize
}

/**
 * The table of contents laid into columns, two to a sheet. A document's layout has no
 * columns of its own to pour text into, so each line's room is counted here and the
 * columns are filled one after the other.
 * @param lines The lines, in reading order.
 * @param room The room the columns have.
 * @returns The columns in reading order, each with the lines it holds.
 */
export function columnsOf(
  lines: readonly ContentsLine[],
  room: ColumnRoom,
): readonly (readonly ColumnLine[])[] {
  const columns: ColumnLine[][] = []
  let left = 0
  for (const line of lines) {
    const height = heightOf(line, room.width)
    if (columns.length === 0 || height > left) {
      left = columns.length < 2 ? room.firstHeight : room.height
      columns.push([])
    }
    columns.at(-1)?.push({ height, line })
    left -= height
  }
  return columns
}

/**
 * The room a line takes: the gap above it, and a row for each line its title runs to.
 * @param line The line.
 * @param width How wide its column is, in points.
 * @returns The room, in points.
 */
function heightOf(line: ContentsLine, width: number): number {
  const { fontSize, gapAbove, indent } = contentsLook[line.level]
  const title = line.level === 1 ? line.title.toLocaleUpperCase("sv-SE") : line.title
  // A title breaks between words, so its rows are never quite full – counted as a
  // tenth wider than it is, a row too many is given sooner than one too few.
  const rows = Math.max(
    1,
    Math.ceil((widthOf(title, fontSize) * 1.1) / (width - indent - numberWidth)),
  )
  return gapAbove + rows * contentsLineHeight
}
