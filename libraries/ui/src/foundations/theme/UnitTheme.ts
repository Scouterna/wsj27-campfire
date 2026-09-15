import type { Theme } from "./Theme"

/**
 * The theme each unit works in – Campfire's own data, because the register knows only
 * the number. The colors are real; nothing here names a unit, and nothing here may: the
 * units' names and artwork are secret until the day the units learn them, and this
 * repository is public.
 */
const unitThemes: Readonly<Record<number, Theme>> = {
  1: "yellow",
  2: "green",
  3: "yellow",
  4: "blue",
  5: "green",
  6: "brown",
  7: "brown",
  8: "green",
  9: "yellow",
  10: "red",
  11: "yellow",
  12: "yellow",
  13: "red",
  14: "blue",
  15: "brown",
  16: "blue",
  17: "brown",
  18: "green",
  19: "green",
  20: "brown",
  21: "red",
  22: "green",
  23: "brown",
  24: "brown",
  25: "blue",
  26: "red",
  27: "yellow",
  28: "green",
  29: "blue",
  30: "brown",
  31: "brown",
  32: "green",
  33: "yellow",
  34: "red",
  35: "blue",
  36: "red",
  37: "yellow",
  38: "brown",
  39: "red",
  40: "blue",
  41: "blue",
  42: "yellow",
  43: "blue",
  44: "green",
  45: "blue",
  46: "green",
  47: "red",
  48: "yellow",
  49: "green",
  50: "blue",
  51: "yellow",
  52: "brown",
  53: "red",
}

/**
 * The theme a unit works in.
 *
 * @param unitNumber The unit's number, as the register gives it.
 * @returns The unit's theme, or blue – the contingent's default – for a unit the table
 * does not know.
 */
export function unitTheme(unitNumber: number): Theme {
  // The key is a number, and a numeric key cannot name a prototype member.
  // eslint-disable-next-line security/detect-object-injection -- key is a number
  return unitThemes[unitNumber] ?? "blue"
}

/**
 * The theme the contingent management works in – red, whatever the function.
 */
export const cmtTheme: Theme = "red"

/**
 * The theme IST works in – red, until the patrols get identities of their own. A
 * per-patrol lookup returns when the first patrol identity does.
 */
export const istTheme: Theme = "red"
