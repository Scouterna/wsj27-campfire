/**
 * How big something is, in pixels.
 */
export interface Size {
  readonly height: number
  readonly width: number
}

/**
 * Where a photo is drawn so that it fills a frame.
 */
export interface CoverRect {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/**
 * Where to draw a photo so it covers the whole frame, cropped rather than squashed, and
 * centered on what the photographer pointed at.
 *
 * A photo is whatever shape the camera took it in and a frame is 4:5, so one of the two
 * axes always has to give. Scaling by the larger ratio fills the frame and pushes the
 * surplus off both ends of the other axis – which keeps faces the right shape, where
 * stretching to fit would not.
 * @param photo The photo's own size.
 * @param frame The frame's size.
 * @returns Where to draw the photo, in the frame's coordinates. The offsets are negative
 * or zero: the drawn photo is never smaller than the frame.
 */
export function coverRect(photo: Size, frame: Size): CoverRect {
  const scale = Math.max(frame.width / photo.width, frame.height / photo.height)
  const width = photo.width * scale
  const height = photo.height * scale
  return { height, width, x: (frame.width - width) / 2, y: (frame.height - height) / 2 }
}
