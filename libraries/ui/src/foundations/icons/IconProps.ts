/**
 * What every icon in the set accepts.
 */
export interface IconProps {
  /**
   * The glyph's edge length, in pixels. Left out, the icon fills the box it is drawn in.
   */
  readonly size?: number
  /**
   * How heavy the line is, two by default. The design thickens it where an icon is the
   * active one, and thins it where it sits behind text.
   */
  readonly strokeWidth?: number
}
