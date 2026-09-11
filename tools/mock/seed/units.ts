import type { Unit } from "../src/types.ts"

/**
 * The two seeded units, by number alone – two, because a leader's boundary needs a unit on
 * each side of it. Their names are secret until the units learn them, and this repository
 * is public. The participants module owns the unit type once it lands; until then the
 * seed carries the numbers and nothing that could name a unit.
 */
export const units: readonly Unit[] = [
  { number: 1, name: "Avdelning 1" },
  { number: 2, name: "Avdelning 2" },
]
