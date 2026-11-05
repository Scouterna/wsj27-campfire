import type { AllergenSeverity, HealthProfile } from "./HealthProfile"
import type { Note } from "./Note"

/**
 * A kind of care a person needs that a leader plans a patrol around – what they cannot
 * eat, what they have to eat, and their health, the support they asked the leaders for
 * included.
 */
export type CareNeed = "allergy" | "diet" | "health"

/**
 * The order the needs are listed in, the most urgent first.
 */
const careNeeds: readonly CareNeed[] = ["allergy", "health", "diet"]

/**
 * The care a person needs, at a glance.
 */
export interface Care {
  /**
   * Marks a need that cannot wait – a serious allergy. Absent otherwise.
   */
  readonly isSerious?: true
  /**
   * What they need, most urgent first. Empty for somebody who declared nothing.
   */
  readonly needs: readonly CareNeed[]
}

/**
 * The allergies graded 4 or 5, the grades that mean a reaction a leader has to act on.
 * @param health Their health profile, where it is the viewer's to read.
 * @returns The serious ones, the worst first, or none.
 */
export function seriousAllergies(health: HealthProfile | undefined): readonly AllergenSeverity[] {
  const severities = health?.foodAllergy?.severities ?? []
  return worstFirst(severities).filter(({ severity }) => severity >= 4)
}

/**
 * Graded allergens in the order to read them when it matters.
 * @param severities The grades, in any order.
 * @returns A new list, the worst first, keeping the order of equal grades.
 */
export function worstFirst(severities: readonly AllergenSeverity[]): readonly AllergenSeverity[] {
  return severities.toSorted((one, other) => other.severity - one.severity)
}

/**
 * The care a person's answers say they need. A need follows from any answer to its
 * questions, however slight, because a leader would rather open one sheet too many than
 * miss the one that mattered – and from nothing else, so what is raised is what the sheet
 * has to show.
 * @param health Their health profile, or undefined where it is not the viewer's to read or
 *   they answered nothing.
 * @param notes What they wrote in the catch-all questions, as far as this reader's surface
 *   shows it.
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
  const mind = health?.mind
  if (
    health?.medication !== undefined ||
    health?.condition !== undefined ||
    health?.equipment !== undefined ||
    health?.mobility !== undefined ||
    mind?.condition !== undefined ||
    mind?.diagnoses !== undefined ||
    mind?.phobia !== undefined ||
    health?.support?.personalAssistant === true ||
    health?.support?.unpredictability !== undefined ||
    notes.length > 0
  ) {
    has.add("health")
  }
  const isSerious = seriousAllergies(health).length > 0
  return {
    needs: careNeeds.filter((need) => has.has(need)),
    ...(isSerious && { isSerious: true }),
  }
}
