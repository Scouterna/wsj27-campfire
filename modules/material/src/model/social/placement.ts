import { exportSize, type TextSlot } from "./Frame"

/**
 * Where a reader has put the text of a slot they may move: its middle, its turn, and
 * its size.
 */
export interface Placement {
  /**
   * How far the text is turned, in degrees between -180 and 180, clockwise positive.
   */
  readonly angle: number
  /**
   * How large the text is, as a share of the picture's height, or undefined while the
   * reader has not sized it and it is fitted to its slot.
   */
  readonly size?: number
  /**
   * Where its middle is, as a share of the picture's width.
   */
  readonly x: number
  /**
   * Where its middle is, as a share of the picture's height.
   */
  readonly y: number
}

/**
 * The color an added text is set in: white or black, whichever reads over the photo, or
 * the color the picture is themed in.
 */
export type TextColor = "black" | "theme" | "white"

/**
 * One text the reader has added to the picture: what it says, where it
 * is, and its color.
 */
export interface PlacedText {
  /**
   * The color it is set in.
   */
  readonly color: TextColor
  /**
   * The text's own name, unique within its frame, used as a React key and to say which
   * text a change is for.
   */
  readonly id: string
  /**
   * Where it is, turned, and how large.
   */
  readonly placement: Placement
  /**
   * What it says.
   */
  readonly text: string
}

/**
 * How wide and high a box is on the finished image, in its pixels.
 */
export interface Extent {
  readonly height: number
  readonly width: number
}

/**
 * A point on the finished image, in its pixels.
 */
export interface Point {
  readonly x: number
  readonly y: number
}

/**
 * The smallest a reader may size text, as a share of the picture's height – still
 * readable on a phone's feed.
 */
export const minSize = 0.02

/**
 * The largest a reader may size text, as a share of the picture's height.
 */
export const maxSize = 0.25

/**
 * Where a movable slot's text starts: in the slot's middle, at its turn, fitted.
 * @param slot the slot
 * @returns The placement.
 */
export function initialPlacement(slot: TextSlot): Placement {
  return {
    angle: slot.angle,
    x: slot.box.x + slot.box.width / 2,
    y: slot.box.y + slot.box.height / 2,
  }
}

/**
 * Where a newly added text starts: where the slot starts its text, a little lower for each
 * text already there, so a new one is never hidden under the last.
 * @param slot the slot added texts go in
 * @param count how many texts are there already
 * @returns The placement.
 */
export function addedPlacement(slot: TextSlot, count: number): Placement {
  const start = initialPlacement(slot)
  return { ...start, y: clamp(start.y + count * 0.14, 0, 0.95) }
}

/**
 * The placement moved by a distance, its middle kept on the picture so the text can
 * never be dragged out of reach.
 * @param placement where the text is
 * @param by how far to move it, in the finished image's pixels
 * @returns The moved placement.
 */
export function moveBy(placement: Placement, by: Point): Placement {
  return {
    ...placement,
    x: clamp(placement.x + by.x / exportSize.width, 0, 1),
    y: clamp(placement.y + by.y / exportSize.height, 0, 1),
  }
}

/**
 * The placement turned a quarter turn, keeping the text straight along one of the
 * picture's edges.
 * @param placement where the text is
 * @param way which way: -1 to the left, 1 to the right
 * @returns The turned placement.
 */
export function turned(placement: Placement, way: -1 | 1): Placement {
  const quarters = Math.round(placement.angle / 90) + way
  return { ...placement, angle: normalized(quarters * 90) }
}

/**
 * The placement sized up or down by a factor, from the size it is drawn at now, kept
 * within what a reader may choose.
 * @param placement where the text is
 * @param size the size it is drawn at now, fitted or chosen, as a share of the picture's
 * height
 * @param factor how much larger, or smaller below one
 * @returns The sized placement.
 */
export function resized(placement: Placement, size: number, factor: number): Placement {
  return { ...placement, size: clamp(size * factor, minSize, maxSize) }
}

/**
 * Whether a point lands on placed text: inside the box its lines take, turned with it.
 * @param placement where the text is
 * @param extent how wide and high the text's box is, in the finished image's pixels
 * @param point where the reader pressed, in the finished image's pixels
 * @returns Whether it is on the text.
 */
export function isOnText(placement: Placement, extent: Extent, point: Point): boolean {
  const radians = (-placement.angle * Math.PI) / 180
  const dx = point.x - placement.x * exportSize.width
  const dy = point.y - placement.y * exportSize.height
  // The point turned back by the text's turn, so the box can be tested as if upright.
  const along = dx * Math.cos(radians) - dy * Math.sin(radians)
  const across = dx * Math.sin(radians) + dy * Math.cos(radians)
  return Math.abs(along) <= extent.width / 2 && Math.abs(across) <= extent.height / 2
}

/**
 * Where a corner of placed text's box is, turned with the text, as shares of the picture.
 * @param placement where the text is
 * @param extent how wide and high its box is, in the finished image's pixels
 * @param corner which corner: -1 for the left or top edge, 1 for the right or bottom
 * @param corner.x which side, -1 for the left and 1 for the right
 * @param corner.y which edge, -1 for the top and 1 for the bottom
 * @returns The corner's middle.
 */
export function cornerOf(
  placement: Placement,
  extent: Extent,
  corner: { readonly x: -1 | 1; readonly y: -1 | 1 },
): Point {
  const radians = (placement.angle * Math.PI) / 180
  const dx = (corner.x * extent.width) / 2
  const dy = (corner.y * extent.height) / 2
  return {
    x: placement.x + (dx * Math.cos(radians) - dy * Math.sin(radians)) / exportSize.width,
    y: placement.y + (dx * Math.sin(radians) + dy * Math.cos(radians)) / exportSize.height,
  }
}

/**
 * An angle brought into -180 to 180, the way it is shown and spoken.
 * @param degrees any angle
 * @returns The same angle, within a turn either way.
 */
export function normalized(degrees: number): number {
  const turned = (((degrees + 180) % 360) + 360) % 360
  return turned - 180
}

function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value))
}
