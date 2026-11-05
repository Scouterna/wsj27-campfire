import type {
  Allergen,
  Diagnosis,
  EquipmentNeed,
  MobilityAid,
  SpecialDiet,
} from "../../model/HealthProfile"
import { isRecord } from "./validation"

/**
 * A person's form answers in one flat map keyed by question key, which the registration
 * template keeps unique across the whole form. The service nests the answers the way the
 * form is laid out, and that layout is presentation the application does not share.
 */
export type Answers = Readonly<Record<string, string | readonly string[]>>

/**
 * One flat answer map from the payload's contact block, readable at basic access, and its
 * forms block, readable only with health access. Unanswered questions are absent upstream
 * and stay absent here, and anything that is not a string, a number, or a list of strings
 * is dropped rather than guessed at.
 * @param contactInfo The `contact_info` block, or whatever arrived in its place.
 * @param formsData The `forms_data` block, or whatever arrived in its place.
 * @returns Every answer the payload holds, keyed by question key.
 */
export function flattenAnswers(contactInfo: unknown, formsData: unknown): Answers {
  // The contact block nests its answers by section.
  const contactSections = isRecord(contactInfo) ? Object.values(contactInfo) : []

  // The forms block nests them by form, tab, and section.
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
 * One single-valued answer, or undefined when it was never given or arrived as a list.
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
 * A multi-select answer, mapped through its label table. Anything the table does not know
 * – including a plain "Nej" – is no selection.
 * @param answers The flattened answers.
 * @param key The question key to read.
 * @param byLabel The Swedish labels this question's options map through.
 * @returns The options the answer selected, in the order they arrived.
 */
export function selections<T>(answers: Answers, key: string, byLabel: ReadonlyMap<string, T>): T[] {
  return labelsOf(answers, key)
    .map((label) => byLabel.get(label))
    .filter((selection): selection is T => selection !== undefined)
}

/**
 * The labels of a multi-select answer that its table does not know, as the applicant saw
 * them. The form's options can change without the tables following, and an answer that
 * stays readable beats one that silently vanishes. A plain "Nej" is still no selection.
 * @param answers The flattened answers.
 * @param key The question key to read.
 * @param byLabel The Swedish labels this question's options map through.
 * @returns The labels no table entry covers, in the order they arrived.
 */
export function unlistedSelections(
  answers: Answers,
  key: string,
  byLabel: ReadonlyMap<string, unknown>,
): string[] {
  return labelsOf(answers, key).filter((label) => label !== "Nej" && !byLabel.has(label))
}

/**
 * A multi-select answer's labels. The service sends a list or a comma-separated string.
 * @param answers The flattened answers.
 * @param key The question key to read.
 * @returns The trimmed labels, without the blanks.
 */
function labelsOf(answers: Answers, key: string): string[] {
  // eslint-disable-next-line security/detect-object-injection -- keys are the module's own literals
  const value = answers[key] ?? []
  const labels = typeof value === "string" ? value.split(",") : value
  return labels.map((label) => label.trim()).filter((label) => label !== "")
}

// The Swedish labels Scoutnet's answers carry, mapped to the domain model's literals. The
// tables absorb the registration form's own spelling, so the screens never see it.

/**
 * The answer that says no special diet is needed, which is no diet rather than one the
 * table has not heard of.
 */
export const noSpecialDiet = "Ingen specialkost"

/**
 * The special diet options, without `noSpecialDiet`. The two forms word the Hindu option
 * differently – "nötkött" for the participants, "kokött" for the leaders – and both are
 * the forms' own spelling.
 */
export const dietByLabel: ReadonlyMap<string, SpecialDiet> = new Map([
  ["Vegetarian", "vegetarian"],
  ["Vegan", "vegan"],
  ["Halal", "halal"],
  ["Kosher", "kosher"],
  ["Hindu - inget kokött", "hinduNoBeef"],
  ["Hindu - inget nötkött", "hinduNoBeef"],
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
  ["Laddning av batteri för CPAP", "cpapCharging"],
  ["Permanent elförsörjning till medicinsk utrustning eller hjälpmedel", "permanentPower"],
  ["Kylning av medicin", "refrigeration"],
  ["Annat", "other"],
])

/**
 * The mobility aid options.
 */
export const mobilityAidByLabel: ReadonlyMap<string, MobilityAid> = new Map([
  ["Käpp", "cane"],
  ["Kryckor", "crutches"],
  ["Elektrisk rullstol", "electricWheelchair"],
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
  ["Bipolär sjukdom", "bipolar"],
  ["Kognitiv funktionsnedsättning", "cognitive"],
  ["Neuropsykiatrisk funktionsnedsättning", "neuropsychiatric"],
  ["OCD", "ocd"],
  ["ODC", "ocd"],
  ["Annat", "other"],
])
