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

/**
 * The theme `?theme=<name>` asks for, or undefined when the query string asks for
 * nothing this design system draws. It is how a visitor picks the color the first paint
 * wears, before anyone has signed in and before any preference has been stored.
 *
 * A query string is whatever someone typed, so a value that is not a theme name is not
 * an error here – it simply does not answer, and the caller falls through to what it
 * would have used anyway.
 *
 * @param search The query string, with or without its leading `?` – `location.search`
 * in the application, and a literal in a test.
 * @returns The theme the search names, or undefined when it names none of the five.
 */
export function themeFromSearch(search: string): Theme | undefined {
  const requested = new URLSearchParams(search).get("theme")

  return isTheme(requested) ? requested : undefined
}
