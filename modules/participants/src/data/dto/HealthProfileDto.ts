import type {
  AllergenSeverity,
  Booster,
  Declared,
  Diet,
  EquipmentNeeds,
  FoodAllergy,
  HealthProfile,
  Medication,
  MentalHealth,
  MobilityNeeds,
  Severity,
  SupportNeeds,
  Vaccinations,
} from "../../model/HealthProfile"
import {
  allergenByKey,
  answer,
  diagnosisByLabel,
  dietByLabel,
  equipmentByLabel,
  mobilityAidByLabel,
  noSpecialDiet,
  selections,
  unlistedSelections,
  type Answers,
} from "./answers"

/**
 * The yes-or-no questions on every form about what a person lives with.
 */
const healthGates = [
  "hasMedicalCondition",
  "hasMentalHealthCondition",
  "hasPhobia",
  "hasPhysicalLimitations",
  "needsMedicalEquipment",
  "usesPrescriptionMedication",
] as const

/**
 * The health profile, read from the flattened answers. This is where the applicant's
 * vocabulary – "Ja", "Nej", the Swedish option labels, "1"–"5" severities – becomes the
 * domain's.
 * @param answers The flattened answers.
 * @returns The profile, with every part that was not declared left out.
 */
export function toHealthProfile(answers: Answers): HealthProfile {
  const diet = toDiet(answers)
  const foodAllergy = toFoodAllergy(answers)
  const otherAllergy = toOtherAllergy(answers)
  const medication = toMedication(answers)
  const condition = toDeclared(answers, "hasMedicalCondition", "medicalConditionDetails")
  const equipment = toEquipment(answers)
  const mobility = toMobility(answers)
  const mind = toMind(answers)
  const support = toSupport(answers)

  return {
    ...(diet !== undefined && { diet }),
    ...(answer(answers, "specialDiet") === noSpecialDiet && { deniesDiet: true }),
    ...(foodAllergy !== undefined && { foodAllergy }),
    ...(answer(answers, "hasFoodAllergy") === "Nej" &&
      foodAllergy === undefined && { deniesFoodAllergy: true }),
    ...(otherAllergy !== undefined && { otherAllergy }),
    ...(answer(answers, "hasOtherAllergy") === "Nej" &&
      otherAllergy === undefined && { deniesOtherAllergy: true }),
    vaccinations: toVaccinations(answers),
    ...(healthGates.every((gate) => answer(answers, gate) !== undefined) && {
      isHealthAnswered: true,
    }),
    ...(medication !== undefined && { medication }),
    ...(condition !== undefined && { condition }),
    ...(equipment !== undefined && { equipment }),
    ...(mobility !== undefined && { mobility }),
    ...(mind !== undefined && { mind }),
    ...(support !== undefined && { support }),
  }
}

/**
 * What a question behind a yes-or-no gate declared. A "Ja" counts even with the text left
 * blank, because that person still said yes.
 * @param answers The flattened answers.
 * @param gateKey The question key of the gate.
 * @param detailsKey The question key of the free text.
 * @returns What they wrote, or undefined when the gate is not a "Ja".
 */
function toDeclared(answers: Answers, gateKey: string, detailsKey: string): Declared | undefined {
  if (answer(answers, gateKey) !== "Ja") {
    return undefined
  }
  const details = answer(answers, detailsKey)
  return details === undefined ? {} : { details }
}

/**
 * The declared special diet. A label the table does not know is a diet all the same, so
 * it is kept as "other" with the label standing in for any text.
 * @param answers The flattened answers.
 * @returns The diet, or undefined when none was declared.
 */
function toDiet(answers: Answers): Diet | undefined {
  const label = answer(answers, "specialDiet")
  if (label === undefined || label === noSpecialDiet) {
    return undefined
  }
  const sort = dietByLabel.get(label)
  const details = answer(answers, "specialDietDetails")
  if (sort === undefined) {
    return { sort: "other", details: details ?? label }
  }
  return { sort, ...(details !== undefined && { details }) }
}

/**
 * The food allergy. The evidence counts as much as the gate, because a stale allergy costs
 * a leader less than a hidden one, so any grade that means an allergy, a ticked "Övriga",
 * or any text raises it whatever the gate says. A 1 is dropped rather than kept as the
 * mildest grade, because the form's scale calls it "Inte allergisk / intolerant", which
 * makes it an allergen somebody ruled out. The leaders' "Övriga" is graded like the rest,
 * and the participants' is a "Ja", which carries no grade.
 * @param answers The flattened answers.
 * @returns The graded allergens and the free text around them, or undefined when nothing
 *   declares an allergy.
 */
function toFoodAllergy(answers: Answers): FoodAllergy | undefined {
  const severities: AllergenSeverity[] = []
  for (const [key, allergen] of allergenByKey) {
    const severity = Number(answer(answers, key))
    if (Number.isSafeInteger(severity) && severity >= 2 && severity <= 5) {
      severities.push({ allergen, severity: severity as Severity })
    }
  }
  const details = answer(answers, "foodAllergyDetails")
  const hasOther = answer(answers, "foodAllergyOther") === "Ja"
  const isGated = answer(answers, "hasFoodAllergy") === "Ja"
  if (!isGated && severities.length === 0 && !hasOther && details === undefined) {
    return undefined
  }
  return {
    severities,
    ...(hasOther && { hasOther: true }),
    ...(details !== undefined && { details }),
  }
}

/**
 * The allergy that is not to food. As with a food allergy, what they wrote counts as much
 * as the gate.
 * @param answers The flattened answers.
 * @returns What they wrote, or undefined when nothing declares an allergy.
 */
function toOtherAllergy(answers: Answers): Declared | undefined {
  const details = answer(answers, "otherAllergyDetails")
  return (
    toDeclared(answers, "hasOtherAllergy", "otherAllergyDetails") ??
    (details === undefined ? undefined : { details })
  )
}

/**
 * A booster answer – given in a year, not given, or never answered. A "Ja" without a
 * usable year counts as never answered.
 * @param answers The flattened answers.
 * @param gateKey The question key that asks whether the booster was given.
 * @param yearKey The question key that asks which year it was given.
 * @returns The booster, in whichever state the answers put it.
 */
function toBooster(answers: Answers, gateKey: string, yearKey: string): Booster {
  const gate = answer(answers, gateKey)
  if (gate === "Ja") {
    const year = Number(answer(answers, yearKey))
    if (Number.isSafeInteger(year)) {
      return { kind: "given", year }
    }
    return { kind: "unanswered" }
  }
  if (gate === "Nej") {
    return { kind: "notGiven" }
  }
  return { kind: "unanswered" }
}

/**
 * The vaccination answers, which everybody gives and which always render.
 * @param answers The flattened answers.
 * @returns Every vaccination answer.
 */
function toVaccinations(answers: Answers): Vaccinations {
  return {
    childhoodProgram: answer(answers, "childhoodVaccinationsComplete") === "Ja",
    diphtheria: toBooster(answers, "diphtheriaBoosterAsAdult", "diphtheriaBoosterYear"),
    tetanus: toBooster(answers, "tetanusBoosterAsAdult", "tetanusBoosterYear"),
  }
}

/**
 * The declared medication.
 * @param answers The flattened answers.
 * @returns The medication, or undefined when none was declared.
 */
function toMedication(answers: Answers): Medication | undefined {
  if (answer(answers, "usesPrescriptionMedication") !== "Ja") {
    return undefined
  }
  const details = answer(answers, "medicationDetails")
  const storage =
    answer(answers, "medicationStorageNeeded") === "Ja"
      ? answer(answers, "medicationStorageDetails")
      : undefined
  const managesOwn = answer(answers, "managesOwnMedication")
  return {
    ...(details !== undefined && { details }),
    ...(storage !== undefined && { storage }),
    ...(managesOwn !== undefined && { managesOwn: managesOwn === "Ja" }),
  }
}

/**
 * The medical equipment somebody brings, behind the question that gates it.
 * @param answers The flattened answers.
 * @returns The equipment needs, or undefined when none were declared.
 */
function toEquipment(answers: Answers): EquipmentNeeds | undefined {
  if (answer(answers, "needsMedicalEquipment") !== "Ja") {
    return undefined
  }
  const details = answer(answers, "medicalEquipmentDetails")
  const unlisted = unlistedSelections(answers, "medicalEquipmentNeeds", equipmentByLabel)
  return {
    needs: selections(answers, "medicalEquipmentNeeds", equipmentByLabel),
    ...(unlisted.length > 0 && { unlisted }),
    ...(details !== undefined && { details }),
  }
}

/**
 * Limited mobility, which any one of its answers can raise on its own.
 * @param answers The flattened answers.
 * @returns The mobility needs, or undefined when none were declared.
 */
function toMobility(answers: Answers): MobilityNeeds | undefined {
  const aids = selections(answers, "mobilityAids", mobilityAidByLabel)
  const unlisted = unlistedSelections(answers, "mobilityAids", mobilityAidByLabel)
  const otherAids = answer(answers, "otherMobilityAidsDetails")
  const isLimited = answer(answers, "hasPhysicalLimitations") === "Ja"
  if (!isLimited && aids.length === 0 && unlisted.length === 0 && otherAids === undefined) {
    return undefined
  }
  const limitations = isLimited ? answer(answers, "physicalLimitationsDetails") : undefined
  return {
    aids,
    ...(unlisted.length > 0 && { unlisted }),
    ...(limitations !== undefined && { limitations }),
    ...(otherAids !== undefined && { otherAids }),
  }
}

/**
 * What was declared about mental health, assembled from independent questions.
 * @param answers The flattened answers.
 * @returns What was declared, or undefined when nothing was.
 */
function toMind(answers: Answers): MentalHealth | undefined {
  const kinds = selections(answers, "cognitiveDiagnoses", diagnosisByLabel)
  const unlisted = unlistedSelections(answers, "cognitiveDiagnoses", diagnosisByLabel)
  const details = answer(answers, "cognitiveDiagnosesDetails")
  const phobia = toDeclared(answers, "hasPhobia", "phobiaDetails")
  const condition = toDeclared(answers, "hasMentalHealthCondition", "mentalHealthDetails")
  const mind: MentalHealth = {
    ...((kinds.length > 0 || unlisted.length > 0) && {
      diagnoses: {
        kinds,
        ...(unlisted.length > 0 && { unlisted }),
        ...(details !== undefined && { details }),
      },
    }),
    ...(phobia !== undefined && { phobia }),
    ...(condition !== undefined && { condition }),
  }
  return Object.keys(mind).length > 0 ? mind : undefined
}

/**
 * Support needs surface only when there is something to support – a "Nej" across the board
 * is the unremarkable default, not a remark.
 * @param answers The flattened answers.
 * @returns The support needs, or undefined when none were asked for.
 */
function toSupport(answers: Answers): SupportNeeds | undefined {
  let support: SupportNeeds = {
    ...(answer(answers, "needsPersonalAssistant") === "Ja" && { personalAssistant: true }),
  }
  if (answer(answers, "sensitivityToUnpredictability") === "Ja") {
    const details = answer(answers, "unpredictabilityDetails")
    support = {
      ...support,
      unpredictability: {
        wantsSupport: answer(answers, "needsSupportForUnpredictability") === "Ja",
        ...(details !== undefined && { details }),
      },
    }
  }
  return Object.keys(support).length > 0 ? support : undefined
}
