/**
 * A picture on a note, at the two sizes the cases service keeps it in, and the shape it
 * was stored at.
 */
export interface Attachment {
  /**
   * The stored picture's height in pixels.
   */
  readonly height: number
  /**
   * The service's identifier.
   */
  readonly id: string
  /**
   * Where the picture is read in full.
   */
  readonly picture: string
  /**
   * Where its thumbnail is read.
   */
  readonly thumbnail: string
  /**
   * The stored picture's width in pixels.
   */
  readonly width: number
}
