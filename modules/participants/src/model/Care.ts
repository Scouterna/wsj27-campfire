import type { HealthProfile } from "./HealthProfile"
import type { Note } from "./Note"

/**
 * A kind of care a person needs that a leader plans a patrol around – what they cannot
 * eat, what they have to eat, their health, and the support they asked the leaders for.
 */
export type CareNeed = "allergy" | "diet" | "health" | "support"

/**
 * The order the needs are listed in, the most urgent first.
 */
export const careNeeds: readonly CareNeed[] = ["allergy", "health", "support", "diet"]

/**
 * What a need is called where it is listed.
 * @param need The need.
 * @returns Its Swedish name.
 */
export function careNeedName(need: CareNeed): string {
  switch (need) {
    case "allergy": {
      return "Allergi"
    }
    case "diet": {
      return "Specialkost"
    }
    case "health": {
      return "Hälsa"
    }
    case "support": {
      return "Stöd"
    }
  }
}

/**
 * The care a person needs, at a glance.
 */
export interface Care {
  /**
   * Marks a need that cannot wait – an allergy graded 4 or 5, the grades that mean a
   * reaction a leader has to act on. Absent otherwise.
   */
  readonly isSerious?: true
  /**
   * What they need, most urgent first. Empty for somebody who declared nothing.
   */
  readonly needs: readonly CareNeed[]
}

/**
 * The care a person's answers say they need. A need follows from any answer to its
 * questions, however slight, because a leader would rather open one popover too many
 * than miss the one that mattered.
 * @param health Their health profile, or undefined where it is not the viewer's to read.
 * @param notes What they wrote in the catch-all questions – only the ones addressed to
 *   the unit's leaders count as a need for support.
 * @returns The needs, and whether one is serious.
 */
export function careOf(health: HealthProfile | undefined, notes: readonly Note[]): Care {
  const has = new Set<CareNeed>()
  if (health?.foodAllergy !== undefined || health?.otherAllergy !== undefined) {
    has.add("allergy")
  }
  if (health?.diet !== undefined) {
    has.add("diet")
  }
  if (
    health?.medication !== undefined ||
    health?.condition !== undefined ||
    health?.equipment !== undefined ||
    health?.mobility !== undefined ||
    health?.mind !== undefined
  ) {
    has.add("health")
  }
  if (
    health?.support !== undefined ||
    notes.some((note) => note.audience === "avdelningsledaren")
  ) {
    has.add("support")
  }
  const isSerious = health?.foodAllergy?.severities.some(({ severity }) => severity >= 4) === true
  return {
    needs: careNeeds.filter((need) => has.has(need)),
    ...(isSerious && { isSerious: true }),
  }
}

/**
 * How many of a group need each kind of care, for weighing a patrol. A need nobody has is
 * absent.
 * @param cares The care each person in the group needs.
 * @returns The counts, most urgent need first.
 */
export function careCounts(cares: readonly Care[]): ReadonlyMap<CareNeed, number> {
  const counts = new Map<CareNeed, number>()
  for (const need of careNeeds) {
    const count = cares.filter((care) => care.needs.includes(need)).length
    if (count > 0) {
      counts.set(need, count)
    }
  }
  return counts
}
