import {
  allergenName,
  specialDiets,
  type Allergen,
  type Severity,
  type SpecialDiet,
} from "./HealthProfile"
import { inReadingOrder } from "./Participant"
import type { ParticipantDetail } from "./ParticipantDetail"

/**
 * How many people in a group have one grade.
 */
export interface GradeCount {
  /**
   * How many people have it – never zero.
   */
  readonly count: number
  /**
   * The grade.
   */
  readonly severity: Severity
}

/**
 * A person in an allergen's group, with their grade for it.
 */
export interface GradedPerson {
  /**
   * Their record in full.
   */
  readonly person: ParticipantDetail
  /**
   * How badly they react to the group's allergen.
   */
  readonly severity: Severity
}

/**
 * The people who graded one allergen.
 */
export interface AllergenGroup {
  /**
   * The allergen they graded.
   */
  readonly allergen: Allergen
  /**
   * The highest grade first, then in reading order.
   */
  readonly people: readonly GradedPerson[]
  /**
   * Each grade present, the highest first.
   */
  readonly split: readonly GradeCount[]
}

/**
 * The people who follow one special diet.
 */
export interface DietGroup {
  /**
   * The people, in reading order.
   */
  readonly people: readonly ParticipantDetail[]
  /**
   * The diet they follow.
   */
  readonly sort: SpecialDiet
}

/**
 * A unit's food needs, grouped by allergen and by diet.
 */
export interface FoodOverview {
  /**
   * One group per graded allergen, the most people first, and a tie by the allergen's
   * name.
   */
  readonly allergens: readonly AllergenGroup[]
  /**
   * One group per special diet followed, the most people first, and a tie in the order
   * the registration lists the diets.
   */
  readonly diets: readonly DietGroup[]
  /**
   * The people who declared a food allergy without grading any allergen, in reading order.
   */
  readonly ungraded: readonly ParticipantDetail[]
  /**
   * How many of the people read came without their answers, and so are in no group.
   */
  readonly withheld: number
}

// Constructed once, because a collator is expensive to build and free to reuse.
const swedish = new Intl.Collator("sv")

/**
 * The grades, the highest first.
 */
const grades: readonly Severity[] = [5, 4, 3, 2]

/**
 * A unit's food needs, from the records its reader was sent. A person is in the group of
 * every allergen they graded and of the diet they follow, and a person whose answers were
 * withheld is counted rather than placed. An allergy that is not to food, and every other
 * health answer, is left out, because it does not change a meal.
 * @param people The unit's records.
 * @returns The groups, each in its own order.
 */
export function foodOverview(people: readonly ParticipantDetail[]): FoodOverview {
  const byAllergen = new Map<Allergen, GradedPerson[]>()
  const byDiet = new Map<SpecialDiet, ParticipantDetail[]>()
  const ungraded: ParticipantDetail[] = []
  let withheld = 0

  // In reading order first, so every later sort, being stable, breaks a tie by name.
  const ordered = inReadingOrder(people)
  for (const person of ordered) {
    if (person.health === undefined) {
      withheld += 1
      continue
    }
    const { diet, foodAllergy } = person.health
    const graded = foodAllergy?.severities ?? []
    for (const { allergen, severity } of graded) {
      const group = byAllergen.get(allergen) ?? []
      group.push({ person, severity })
      byAllergen.set(allergen, group)
    }
    if (foodAllergy?.severities.length === 0) {
      ungraded.push(person)
    }
    if (diet !== undefined) {
      const group = byDiet.get(diet.sort) ?? []
      group.push(person)
      byDiet.set(diet.sort, group)
    }
  }

  const allergens = [...byAllergen]
    .map(([allergen, graders]) => ({
      allergen,
      people: graders.toSorted((left, right) => right.severity - left.severity),
      split: grades
        .map((severity) => ({
          count: graders.filter((entry) => entry.severity === severity).length,
          severity,
        }))
        .filter((grade) => grade.count > 0),
    }))
    .toSorted(
      (left, right) =>
        right.people.length - left.people.length ||
        swedish.compare(allergenName(left.allergen), allergenName(right.allergen)),
    )

  const diets = [...byDiet]
    .map(([sort, followers]) => ({ people: followers, sort }))
    .toSorted(
      (left, right) =>
        right.people.length - left.people.length ||
        specialDiets.indexOf(left.sort) - specialDiets.indexOf(right.sort),
    )

  return { allergens, diets, ungraded, withheld }
}
