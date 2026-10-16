import type { Theme } from "@scouterna/wsj27-campfire-ui"

/**
 * A rectangle as a share of the whole picture, so it holds at any size the picture is
 * drawn in.
 */
export interface Box {
  /**
   * How high it is, as a share of the picture's height.
   */
  readonly height: number
  /**
   * How wide it is, as a share of the picture's width.
   */
  readonly width: number
  /**
   * Where its left edge is, as a share of the picture's width.
   */
  readonly x: number
  /**
   * Where its top edge is, as a share of the picture's height.
   */
  readonly y: number
}

/**
 * A place in a frame where the reader may write, measured from the artwork.
 *
 * The box is the slot before it is turned, centered on the same point, so a slot along a
 * slanted strip is the strip's own straight run turned by its angle.
 */
export interface TextSlot {
  /**
   * How far the text is turned, in degrees, clockwise being positive as on a canvas.
   */
  readonly angle: number
  /**
   * Where the text fits, before it is turned.
   */
  readonly box: Box
  /**
   * The slot's own name, unique within its frame, used as a React key.
   */
  readonly id: string
  /**
   * Whether the reader may drag, turn, and size the text rather than have it set in the
   * slot. The box is then only where it starts and what it is first fitted to.
   */
  readonly isMovable: boolean
  /**
   * Whether the reader may write several lines. A strip holds one; the middle of a
   * photo holds a block.
   */
  readonly isMultiline: boolean
  /**
   * What the field that fills it is called, in Swedish.
   */
  readonly label: string
  /**
   * The largest the text is ever drawn, as a share of the picture's height, so a short
   * word does not swell to fill the whole slot.
   */
  readonly maxSize: number
}

/**
 * One frame design, in every color it is drawn in.
 */
export interface Frame {
  /**
   * The design's own name, used in the name of a download and as a React key.
   */
  readonly id: string
  /**
   * What the reader is offered it as, in Swedish. Also the name of the control that
   * downloads it, so it has to read on its own.
   */
  readonly label: string
  /**
   * Where the unit's mark sits, or undefined for a design that carries none.
   */
  readonly markBox?: Box
  /**
   * Where the reader may write, in the order the fields are offered.
   */
  readonly slots: readonly TextSlot[]
  /**
   * Where the artwork is served from, one per theme. Every design exists in all five, so
   * the choice a reader is offered is the same whatever color they wear.
   */
  readonly sources: Readonly<Record<Theme, string>>
}

/**
 * How wide and high a finished image is: Instagram's usual 4:5 portrait post, and the
 * shape every frame in the graphic profile is drawn for.
 */
export const exportSize = { height: 1350, width: 1080 } as const
