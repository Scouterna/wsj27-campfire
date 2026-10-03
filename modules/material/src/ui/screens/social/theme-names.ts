import type { Theme } from "@scouterna/wsj27-campfire-ui"

/**
 * What each color is called, for the controls that pick one. The five are the
 * contingent's own identities, and a unit wears one of them.
 */
export const themeNames: Readonly<Record<Theme, string>> = {
  blue: "Blå",
  brown: "Brun",
  green: "Grön",
  red: "Röd",
  yellow: "Gul",
}
