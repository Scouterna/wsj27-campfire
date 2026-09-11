/**
 * The five unit colors the contingent's identities are built from. Blue is the
 * contingent's own and the default; the values behind the names are in
 * `assets/styles/tokens.css`, so adding one is a change in both places.
 */
export const themes = ["blue", "brown", "green", "red", "yellow"] as const

/**
 * One of the five unit colors.
 */
export type Theme = (typeof themes)[number]

/**
 * Whether an untyped value names one of the five themes. The theme reaches this package
 * from outside – a stored preference, a query parameter, Storybook's toolbar – so it is
 * checked rather than asserted.
 *
 * @param value The untyped value to check.
 * @returns True when the value is a theme name.
 */
export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value)
}
