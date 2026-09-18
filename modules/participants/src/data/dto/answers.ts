import type {
  Allergen,
  Diagnosis,
  EquipmentNeed,
  MobilityAid,
  SpecialDiet,
} from "../../model/HealthProfile"
import { isRecord } from "./validation"

/**
 * The participants service publishes a person's form answers as two nested blocks:
 * `contact_info` (section → key → answer, basic access) and `forms_data` (form → tab →
 * section → key → answer, health access). The nesting mirrors the registration form's
 * layout, which is presentation the application does not share – so the first thing this
 * module does is flatten both into one map keyed by the question keys, which the template
 * guarantees are unique across the whole form.
 */
export type Answers = Readonly<Record<string, string | readonly string[]>>

/**
 * One flat answer map from the payload's two blocks. Unanswered questions are simply
 * absent upstream and stay absent here; anything that is not a string, a number, or a list
 * of strings is dropped rather than guessed at.
 * @param contactInfo The `contact_info` block, or whatever arrived in its place.
 * @param formsData The `forms_data` block, or whatever arrived in its place.
 * @returns Every answer the payload holds, keyed by question key.
 */
export function flattenAnswers(contactInfo: unknown, formsData: unknown): Answers {
  // contact_info: section → {key: answer}
  const contactSections = isRecord(contactInfo) ? Object.values(contactInfo) : []

  // forms_data: form → tab → section → {key: answer}
  const formSections = isRecord(formsData)
    ? Object.values(formsData)
        .filter((form) => isRecord(form))
        .flatMap((form) => Object.values(form))
        .filter((tab) => isRecord(tab))
        .flatMap((tab) => Object.values(tab))
    : []

  return Object.fromEntries(
    [...contactSections, ...formSections].flatMap((section) => sectionEntries(section)),
  )
}

/**
 * One section's usable answers, as entries. A section that is not a record has none.
 * @param section The section the payload nested the answers in.
 * @returns The section's usable answers, as key and value pairs.
 */
function sectionEntries(section: unknown): [string, string | readonly string[]][] {
  if (!isRecord(section)) {
    return []
  }
  const entries: [string, string | readonly string[]][] = []
  for (const [key, value] of Object.entries(section)) {
    if (typeof value === "string" && value !== "") {
      entries.push([key, value])
    } else if (typeof value === "number") {
      entries.push([key, String(value)])
    } else if (Array.isArray(value)) {
      const items = value.filter((item): item is string => typeof item === "string")
      if (items.length > 0) {
        entries.push([key, items])
      }
    }
  }
  return entries
}

/**
 * One single-valued answer by a computed key, or undefined when it was never given or
 * arrived as a list. Every key passed in this folder is one of its own literals or table
 * entries, never input.
 * @param answers The flattened answers.
 * @param key The question key to read.
 * @returns The answer, or undefined when there is no single-valued one.
 */
export function answer(answers: Answers, key: string): string | undefined {
  // eslint-disable-next-line security/detect-object-injection -- keys are the module's own literals
  const value = answers[key]
  return typeof value === "string" ? value : undefined
}

/**
 * A multi-select answer, mapped through its label table. The service sends a list;
 * anything the table does not know – including a plain "Nej" – is no selection.
 * @param answers The flattened answers.
 * @param key The question key to read.
 * @param byLabel The Swedish labels this question's options map through.
 * @returns The options the answer selected, in the order they arrived.
 */
export function selections<T>(answers: Answers, key: string, byLabel: ReadonlyMap<string, T>): T[] {
  // eslint-disable-next-line security/detect-object-injection -- keys are the module's own literals
  const value = answers[key]
  if (value === undefined) {
    return []
  }
  const labels = typeof value === "string" ? value.split(",") : value
  return labels
    .map((label) => byLabel.get(label.trim()))
    .filter((selection): selection is T => selection !== undefined)
}

/**
 * The Swedish labels Scoutnet's answers carry, mapped to the domain model's literals. The
 * tables absorb the registration's own quirks – the "kokött" and "ODC" typos are the real
 * form's spelling, and they stop here so the screens never see them.
 */

/**
 * The special diet options. "Ingen specialkost" is deliberately absent – no special diet
 * is no diet at all.
 */
export const dietByLabel: ReadonlyMap<string, SpecialDiet> = new Map([
  ["Vegetarian", "vegetarian"],
  ["Vegan", "vegan"],
  ["Halal", "halal"],
  ["Kosher", "kosher"],
  ["Hindu - inget kokött", "hinduNoBeef"],
  ["Annat", "other"],
])

/**
 * The per-allergen answer keys and the allergen each one grades.
 */
export const allergenByKey: ReadonlyMap<string, Allergen> = new Map([
  ["foodAllergyLegumes", "legumes"],
  ["foodAllergyFish", "fish"],
  ["foodAllergyFruit", "fruit"],
  ["foodAllergyGluten", "gluten"],
  ["foodAllergyVegetables", "vegetables"],
  ["foodAllergyLactose", "lactose"],
  ["foodAllergyMilkProtein", "milkProtein"],
  ["foodAllergyNuts", "nuts"],
  ["foodAllergyMustard", "mustard"],
  ["foodAllergySesame", "sesame"],
  ["foodAllergyShellfish", "shellfish"],
  ["foodAllergyCereals", "cereals"],
  ["foodAllergySulphites", "sulphites"],
  ["foodAllergyEgg", "egg"],
  ["foodAllergyOther", "other"],
])

/**
 * The medical equipment options.
 */
export const equipmentByLabel: ReadonlyMap<string, EquipmentNeed> = new Map([
  ["Laddning av CPAP", "cpapCharging"],
  ["Permanent ström till medicinsk utrustning", "permanentPower"],
  ["Kylförvaring av medicin", "refrigeration"],
  ["Annat", "other"],
])

/**
 * The mobility aid options.
 */
export const mobilityAidByLabel: ReadonlyMap<string, MobilityAid> = new Map([
  ["Käpp", "cane"],
  ["Kryckor", "crutches"],
  ["Elrullstol", "electricWheelchair"],
  ["Rullator", "walker"],
  ["Större tält", "largerTent"],
  ["Andra hjälpmedel", "other"],
])

/**
 * The diagnosis options – both the correct "OCD" and the form's "ODC" typo land on the
 * same literal.
 */
export const diagnosisByLabel: ReadonlyMap<string, Diagnosis> = new Map([
  ["ADD", "add"],
  ["ADHD", "adhd"],
  ["Autism", "autism"],
  ["Bipolär", "bipolar"],
  ["Kognitiv funktionsnedsättning", "cognitive"],
  ["Neuropsykiatrisk funktionsnedsättning", "neuropsychiatric"],
  ["OCD", "ocd"],
  ["ODC", "ocd"],
  ["Annat", "other"],
])
