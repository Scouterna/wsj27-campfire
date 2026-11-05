/**
 * What a screen draws for a question somebody said yes to and wrote nothing under, so the
 * yes still reads as one.
 */
export const noDescription = "Ingen beskrivning ifylld."

/**
 * Something declared behind a yes-or-no question.
 */
export interface Declared {
  /**
   * What they wrote about it. Absent when they left the text blank.
   */
  readonly details?: string
}

/**
 * The special diets the registration offers. A closed set – "no special diet" is the
 * absence of a `Diet`, not a member of it.
 */
export type SpecialDiet = "vegetarian" | "vegan" | "halal" | "kosher" | "hinduNoBeef" | "other"

/**
 * What a special diet is called in Swedish.
 * @param diet The diet to name.
 * @returns The Swedish label.
 */
export function dietName(diet: SpecialDiet): string {
  switch (diet) {
    case "vegetarian": {
      return "Vegetarian"
    }
    case "vegan": {
      return "Vegan"
    }
    case "halal": {
      return "Halal"
    }
    case "kosher": {
      return "Kosher"
    }
    case "hinduNoBeef": {
      return "Hindu – inget nötkött"
    }
    case "other": {
      return "Annat"
    }
  }
}

/**
 * A special diet as somebody declared it: which one, and the free text that qualifies it.
 * The detail lives inside the fact, so "details without a diet" cannot exist.
 */
export interface Diet {
  /**
   * Which diet they declared.
   */
  readonly sort: SpecialDiet
  /**
   * What they wrote about it.
   */
  readonly details?: string
}

/**
 * The allergens the registration asks about, one severity question each.
 */
export type Allergen =
  | "legumes"
  | "fish"
  | "fruit"
  | "gluten"
  | "vegetables"
  | "lactose"
  | "milkProtein"
  | "nuts"
  | "mustard"
  | "sesame"
  | "shellfish"
  | "cereals"
  | "sulphites"
  | "egg"
  | "other"

/**
 * What an allergen is called in Swedish.
 * @param allergen The allergen to name.
 * @returns The Swedish label.
 */
export function allergenName(allergen: Allergen): string {
  switch (allergen) {
    case "legumes": {
      return "Baljväxter"
    }
    case "fish": {
      return "Fisk"
    }
    case "fruit": {
      return "Frukt"
    }
    case "gluten": {
      return "Gluten"
    }
    case "vegetables": {
      return "Grönsaker"
    }
    case "lactose": {
      return "Laktos"
    }
    case "milkProtein": {
      return "Mjölkprotein"
    }
    case "nuts": {
      return "Nötter"
    }
    case "mustard": {
      return "Senap"
    }
    case "sesame": {
      return "Sesamfrön"
    }
    case "shellfish": {
      return "Skaldjur"
    }
    case "cereals": {
      return "Spannmål"
    }
    case "sulphites": {
      return "Sulfiter"
    }
    case "egg": {
      return "Ägg"
    }
    case "other": {
      return "Övriga"
    }
  }
}

/**
 * How serious a reaction is, on the registration's 1–5 scale. A 1 is that scale's own
 * "Inte allergisk / intolerant" – the answer that there is no allergy – so it never becomes
 * a severity, and the grades that do run 2 to 5.
 */
export type Severity = 2 | 3 | 4 | 5

/**
 * One allergen and how badly this person reacts to it.
 */
export interface AllergenSeverity {
  /**
   * The allergen being graded.
   */
  readonly allergen: Allergen
  /**
   * How badly they react to it.
   */
  readonly severity: Severity
}

/**
 * A food allergy as declared: the graded allergens, and the free text around them.
 */
export interface FoodAllergy {
  /**
   * Marks a ticked "Övriga" on the participant form, which has no grade, so what it is and
   * how serious stand in the free text. Absent otherwise.
   */
  readonly hasOther?: true
  /**
   * The allergens they graded.
   */
  readonly severities: readonly AllergenSeverity[]
  /**
   * What they wrote about their allergy.
   */
  readonly details?: string
}

/**
 * One booster's answer. A union rather than an optional because the screen tells the
 * states apart – a year pill, an explicit no, and "Ej besvarad".
 */
export type Booster =
  | { readonly kind: "given"; readonly year: number }
  | { readonly kind: "notGiven" }
  | { readonly kind: "unanswered" }

/**
 * The vaccination answers everybody gives. Always present, unlike the rest of the
 * profile – the registration requires them, and they render in their own card.
 */
export interface Vaccinations {
  /**
   * Whether the childhood program was completed.
   */
  readonly childhoodProgram: boolean
  /**
   * The diphtheria booster as an adult.
   */
  readonly diphtheria: Booster
  /**
   * The tetanus booster as an adult.
   */
  readonly tetanus: Booster
}

/**
 * Prescribed medication as declared, with how it is stored and, on the participant form
 * only, whether they manage it themselves.
 */
export interface Medication {
  /**
   * What they take, in their own words. Absent when they left the text blank.
   */
  readonly details?: string
  /**
   * How it has to be stored, when that was asked and answered.
   */
  readonly storage?: string
  /**
   * Whether they manage it themselves – asked on the participant form only.
   */
  readonly managesOwn?: boolean
}

/**
 * The medical-equipment needs the registration asks about.
 */
export type EquipmentNeed = "cpapCharging" | "permanentPower" | "refrigeration" | "other"

/**
 * What an equipment need is called in Swedish.
 * @param need The need to name.
 * @returns The Swedish label.
 */
export function equipmentNeedName(need: EquipmentNeed): string {
  switch (need) {
    case "cpapCharging": {
      return "Laddning av CPAP"
    }
    case "permanentPower": {
      return "Permanent ström till medicinsk utrustning"
    }
    case "refrigeration": {
      return "Kylförvaring av medicin"
    }
    case "other": {
      return "Annat"
    }
  }
}

/**
 * Medical equipment somebody brings, and the free text that qualifies it.
 */
export interface EquipmentNeeds {
  /**
   * The needs they selected.
   */
  readonly needs: readonly EquipmentNeed[]
  /**
   * Options they selected that this build does not know, as the form words them.
   */
  readonly unlisted?: readonly string[]
  /**
   * What they wrote about them.
   */
  readonly details?: string
}

/**
 * The mobility aids the registration asks about.
 */
export type MobilityAid =
  "cane" | "crutches" | "electricWheelchair" | "walker" | "largerTent" | "other"

/**
 * What a mobility aid is called in Swedish.
 * @param aid The aid to name.
 * @returns The Swedish label.
 */
export function mobilityAidName(aid: MobilityAid): string {
  switch (aid) {
    case "cane": {
      return "Käpp"
    }
    case "crutches": {
      return "Kryckor"
    }
    case "electricWheelchair": {
      return "Elrullstol"
    }
    case "walker": {
      return "Rullator"
    }
    case "largerTent": {
      return "Större tält"
    }
    case "other": {
      return "Andra hjälpmedel"
    }
  }
}

/**
 * Limited mobility as declared: the limitation itself, the aids used, and any aid the
 * registration's list did not cover.
 */
export interface MobilityNeeds {
  /**
   * What limits them, in their own words.
   */
  readonly limitations?: string
  /**
   * The aids they selected from the list.
   */
  readonly aids: readonly MobilityAid[]
  /**
   * Options they selected that this build does not know, as the form words them.
   */
  readonly unlisted?: readonly string[]
  /**
   * An aid the list did not offer.
   */
  readonly otherAids?: string
}

/**
 * The diagnoses the registration asks about.
 */
export type Diagnosis =
  "add" | "adhd" | "autism" | "bipolar" | "cognitive" | "neuropsychiatric" | "ocd" | "other"

/**
 * What a diagnosis is called in Swedish.
 * @param diagnosis The diagnosis to name.
 * @returns The Swedish label.
 */
export function diagnosisName(diagnosis: Diagnosis): string {
  switch (diagnosis) {
    case "add": {
      return "ADD"
    }
    case "adhd": {
      return "ADHD"
    }
    case "autism": {
      return "Autism"
    }
    case "bipolar": {
      return "Bipolär"
    }
    case "cognitive": {
      return "Kognitiv funktionsnedsättning"
    }
    case "neuropsychiatric": {
      return "Neuropsykiatrisk funktionsnedsättning"
    }
    case "ocd": {
      return "OCD"
    }
    case "other": {
      return "Annat"
    }
  }
}

/**
 * Mental health as declared: diagnoses with their free text, a phobia, and any other
 * condition worth knowing about.
 */
export interface MentalHealth {
  /**
   * The diagnoses they selected, any this build does not know as the form words them, and
   * what they wrote about them.
   */
  readonly diagnoses?: {
    readonly details?: string
    readonly kinds: readonly Diagnosis[]
    readonly unlisted?: readonly string[]
  }
  /**
   * A phobia, and what they are afraid of.
   */
  readonly phobia?: Declared
  /**
   * Another condition worth knowing about.
   */
  readonly condition?: Declared
}

/**
 * The support answers the participant form asks for.
 */
export interface SupportNeeds {
  /**
   * Whether they need a personal assistant.
   */
  readonly personalAssistant?: boolean
  /**
   * How they handle the unpredictable, and whether they want support with it.
   */
  readonly unpredictability?: { readonly wantsSupport: boolean; readonly details?: string }
}

/**
 * Somebody's health as they declared it. Every part except the vaccinations is a fact
 * that exists only when declared – an absent part is nothing to say, and a screen renders
 * nothing for it.
 */
export interface HealthProfile {
  /**
   * The special diet they declared.
   */
  readonly diet?: Diet
  /**
   * Marks an explicit "no special diet", which is what tells it from a question never
   * answered. Absent otherwise.
   */
  readonly deniesDiet?: true
  /**
   * Marks an explicit "Nej" to the food allergy question with nothing to contradict it,
   * which is what tells no allergy from a question never answered. Absent otherwise.
   */
  readonly deniesFoodAllergy?: true
  /**
   * Marks an explicit "Nej" to the other allergy question with nothing to contradict it,
   * which is what tells no allergy from a question never answered. Absent otherwise.
   */
  readonly deniesOtherAllergy?: true
  /**
   * The food allergy they declared.
   */
  readonly foodAllergy?: FoodAllergy
  /**
   * An allergy that is not to food.
   */
  readonly otherAllergy?: Declared
  /**
   * The vaccination answers, which everybody gives.
   */
  readonly vaccinations: Vaccinations
  /**
   * Marks a form where every yes-or-no question about health has an answer, because a
   * half-filled form saying nothing is not an all-clear. Absent otherwise.
   */
  readonly isHealthAnswered?: true
  /**
   * The medication they take.
   */
  readonly medication?: Medication
  /**
   * A medical condition they declared.
   */
  readonly condition?: Declared
  /**
   * The medical equipment they bring.
   */
  readonly equipment?: EquipmentNeeds
  /**
   * How their mobility is limited, and what helps.
   */
  readonly mobility?: MobilityNeeds
  /**
   * What they declared about their mental health.
   */
  readonly mind?: MentalHealth
  /**
   * The support they asked for.
   */
  readonly support?: SupportNeeds
}

/**
 * Whether a food allergy was declared with nothing graded and nothing written. It still
 * shows, or a leader reads the silence as no allergy at all.
 * @param allergy The allergy as declared.
 * @returns True where the yes is all there is.
 */
export function isBlankAllergy(allergy: FoodAllergy): boolean {
  return (
    allergy.severities.length === 0 && allergy.hasOther !== true && allergy.details === undefined
  )
}

/**
 * Whether a health profile is an all-clear – what drives the "Inga hälsoanmärkningar" chip.
 * The vaccinations do not count against it; they render in their own card whatever they
 * say.
 * @param health The profile to weigh.
 * @returns True when the health questions were answered and nothing beyond the vaccinations
 *   was declared.
 */
export function isUnremarkable(health: HealthProfile): boolean {
  return (
    health.isHealthAnswered === true &&
    health.diet === undefined &&
    health.foodAllergy === undefined &&
    health.otherAllergy === undefined &&
    health.medication === undefined &&
    health.condition === undefined &&
    health.equipment === undefined &&
    health.mobility === undefined &&
    health.mind === undefined &&
    health.support === undefined
  )
}
