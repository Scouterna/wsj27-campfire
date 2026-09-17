/**
 * What every icon in the set accepts. Both are optional and both default to what the set
 * has always drawn, so an existing call site keeps its render.
 */
export interface IconProps {
  /**
   * The glyph's edge length, in pixels. Left out by default, so the icon fills the box it
   * is drawn in – which is how every call site sizes it today.
   */
  readonly size?: number
  /**
   * How heavy the line is. Two by default; the design thickens it where an icon is the
   * active one, and thins it where it sits behind text.
   */
  readonly strokeWidth?: number
}
