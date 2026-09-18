import type {
  AllergenSeverity,
  Booster,
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
  selections,
  type Answers,
} from "./answers"

/**
 * The health profile, read straight from the flattened form answers. The participants
 * service publishes the answers as the applicant gave them – "Ja", "Nej", the Swedish
 * option labels, "1"–"5" severities – and this file is where that vocabulary becomes the
 * domain's. It only runs when the payload carried `forms_data` at all: a caller without
 * health access never gets the block, and absence of the profile is how the screens know
 * not to caveat what they cannot show.
 * @param answers The flattened answers.
 * @returns The profile, with every part that was not declared left out.
 */
export function toHealthProfile(answers: Answers): HealthProfile {
  const diet = toDiet(answers)
  const foodAllergy =
    answer(answers, "hasFoodAllergy") === "Ja" ? toFoodAllergy(answers) : undefined
  const otherAllergy =
    answer(answers, "hasOtherAllergy") === "Ja" ? answer(answers, "otherAllergyDetails") : undefined
  const medication = toMedication(answers)
  const condition =
    answer(answers, "hasMedicalCondition") === "Ja"
      ? answer(answers, "medicalConditionDetails")
      : undefined
  const equipment = toEquipment(answers)
  const mobility = toMobility(answers)
  const mind = toMind(answers)
  const support = toSupport(answers)

  return {
    ...(diet !== undefined && { diet }),
    ...(foodAllergy !== undefined && { foodAllergy }),
    ...(otherAllergy !== undefined && { otherAllergy }),
    vaccinations: toVaccinations(answers),
    ...(medication !== undefined && { medication }),
    ...(condition !== undefined && { condition }),
    ...(equipment !== undefined && { equipment }),
    ...(mobility !== undefined && { mobility }),
    ...(mind !== undefined && { mind }),
    ...(support !== undefined && { support }),
  }
}

/**
 * The declared special diet. "Ingen specialkost" is not in the table, so it converts to
 * nothing.
 * @param answers The flattened answers.
 * @returns The diet, or undefined when none was declared.
 */
function toDiet(answers: Answers): Diet | undefined {
  const sort = dietByLabel.get(answer(answers, "specialDiet") ?? "")
  if (sort === undefined) {
    return undefined
  }
  const details = answer(answers, "specialDietDetails")
  return { sort, ...(details !== undefined && { details }) }
}

/**
 * The graded allergens. Only a numeric value carries a severity – the participant form's
 * "Övriga" is a yes/no, so a "Ja" adds no entry, and the free text is where that answer
 * shows up.
 * @param answers The flattened answers.
 * @returns The graded allergens and the free text around them.
 */
function toFoodAllergy(answers: Answers): FoodAllergy {
  const severities: AllergenSeverity[] = []
  for (const [key, allergen] of allergenByKey) {
    const severity = Number(answer(answers, key))
    if (Number.isSafeInteger(severity) && severity >= 1 && severity <= 5) {
      severities.push({ allergen, severity: severity as Severity })
    }
  }
  const details = answer(answers, "foodAllergyDetails")
  return { severities, ...(details !== undefined && { details }) }
}

/**
 * A booster answer in its three states: "Ja" with a year, "Nej", or never answered.
 * @param answers The flattened answers.
 * @param gateKey The question key that asks whether the booster was given.
 * @param yearKey The question key that asks which year it was given.
 * @returns The booster, in whichever of the three states the answers put it.
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
 * @returns The three vaccination answers.
 */
function toVaccinations(answers: Answers): Vaccinations {
  return {
    childhoodProgram: answer(answers, "childhoodVaccinationsComplete") === "Ja",
    diphtheria: toBooster(answers, "diphtheriaBoosterAsAdult", "diphtheriaBoosterYear"),
    tetanus: toBooster(answers, "tetanusBoosterAsAdult", "tetanusBoosterYear"),
  }
}

/**
 * The declared medication, which needs its own free text to be worth anything.
 * @param answers The flattened answers.
 * @returns The medication, or undefined when none was declared.
 */
function toMedication(answers: Answers): Medication | undefined {
  if (answer(answers, "usesPrescriptionMedication") !== "Ja") {
    return undefined
  }
  const details = answer(answers, "medicationDetails")
  if (details === undefined) {
    return undefined
  }
  const storage =
    answer(answers, "medicationStorageNeeded") === "Ja"
      ? answer(answers, "medicationStorageDetails")
      : undefined
  const managesOwn = answer(answers, "managesOwnMedication")
  return {
    details,
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
  return {
    needs: selections(answers, "medicalEquipmentNeeds", equipmentByLabel),
    ...(details !== undefined && { details }),
  }
}

/**
 * Limited mobility, which any of the three answers can raise on its own.
 * @param answers The flattened answers.
 * @returns The mobility needs, or undefined when none were declared.
 */
function toMobility(answers: Answers): MobilityNeeds | undefined {
  const aids = selections(answers, "mobilityAids", mobilityAidByLabel)
  const otherAids = answer(answers, "otherMobilityAidsDetails")
  const isLimited = answer(answers, "hasPhysicalLimitations") === "Ja"
  if (!isLimited && aids.length === 0 && otherAids === undefined) {
    return undefined
  }
  const limitations = isLimited ? answer(answers, "physicalLimitationsDetails") : undefined
  return {
    aids,
    ...(limitations !== undefined && { limitations }),
    ...(otherAids !== undefined && { otherAids }),
  }
}

/**
 * What was declared about mental health, assembled from three independent questions.
 * @param answers The flattened answers.
 * @returns What was declared, or undefined when nothing was.
 */
function toMind(answers: Answers): MentalHealth | undefined {
  let mind: MentalHealth = {}
  const kinds = selections(answers, "cognitiveDiagnoses", diagnosisByLabel)
  if (kinds.length > 0) {
    const details = answer(answers, "cognitiveDiagnosesDetails")
    mind = { diagnoses: { kinds, ...(details !== undefined && { details }) } }
  }
  if (answer(answers, "hasPhobia") === "Ja") {
    const phobia = answer(answers, "phobiaDetails")
    if (phobia !== undefined) {
      mind = { ...mind, phobia }
    }
  }
  if (answer(answers, "hasMentalHealthCondition") === "Ja") {
    const condition = answer(answers, "mentalHealthDetails")
    if (condition !== undefined) {
      mind = { ...mind, condition }
    }
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
