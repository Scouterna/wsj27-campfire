// Each glyph is its own file with a hashed name, loaded like any image, so only its address
// is in the bundle. Eager, because the addresses are strings and the avatar needs one on its
// first render.
const glyphs = import.meta.glob<string>("../../../assets/units/*.svg", {
  eager: true,
  import: "default",
  query: "?no-inline",
})

// Each glyph's file is named for its number – "7.svg".
const glyphsByNumber: ReadonlyMap<number, string> = new Map(
  Object.entries(glyphs).map(([path, url]) => [
    Number(path.slice(path.lastIndexOf("/") + 1, -".svg".length)),
    url,
  ]),
)

/**
 * Where the white glyph for a unit, the IST, or the contingent management is served.
 * @param unitNumber A unit's number, or the IST's or the management's slot beyond the units.
 * @returns The glyph's address, or undefined for a number that has no glyph.
 */
export function glyphUrl(unitNumber: number): string | undefined {
  return glyphsByNumber.get(unitNumber)
}
