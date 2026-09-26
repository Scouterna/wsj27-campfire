import type { Unit } from "../src/types.ts"

/**
 * The two seeded units – two, because a leader's boundary needs a unit on each side of
 * it. Each is named by its number alone, because the units' real names and glyphs are
 * the web application's own data, and never the mock's.
 */
export const units: readonly Unit[] = [
  { number: 1, name: "Avdelning 1" },
  { number: 2, name: "Avdelning 2" },
]
