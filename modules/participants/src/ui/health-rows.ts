import type { FieldRow } from "@scouterna/wsj27-campfire-ui"

import {
  diagnosisName,
  equipmentNeedName,
  mobilityAidName,
  noDescription,
  type HealthProfile,
} from "../model/HealthProfile"

/**
 * What was declared about medication, as rows.
 * @param health The health profile to read.
 * @returns The rows, or none where nothing was declared.
 */
function medicationRows(health: HealthProfile): readonly FieldRow[] {
  const medication = health.medication
  if (medication === undefined) {
    return []
  }
  const rows: FieldRow[] = [
    { label: "Receptbelagda läkemedel", value: medication.details ?? noDescription },
  ]
  if (medication.managesOwn !== undefined) {
    rows.push({
      label: "Tar själv ansvar för medicinering",
      value: medication.managesOwn ? "Ja" : "Nej",
    })
  }
  if (medication.storage !== undefined) {
    rows.push({ label: "Särskild förvaring", value: medication.storage })
  }
  return rows
}

/**
 * What was declared about moving around: the aids named, with the limitation quoted under
 * them – or the limitation on its own where no aid was named, so a "Ja" with its
 * follow-ups blank still reads as one.
 * @param health The health profile to read.
 * @returns The row, or none where nothing was declared.
 */
function mobilityRows(health: HealthProfile): readonly FieldRow[] {
  const mobility = health.mobility
  if (mobility === undefined) {
    return []
  }
  const aids = [
    ...mobility.aids.map((aid) => mobilityAidName(aid)),
    ...(mobility.unlisted ?? []),
    ...(mobility.otherAids === undefined ? [] : [mobility.otherAids]),
  ].join(", ")

  if (aids === "") {
    return [{ label: "Hjälpmedel", value: mobility.limitations ?? noDescription }]
  }
  return [
    {
      label: "Hjälpmedel",
      value: aids,
      ...(mobility.limitations !== undefined && { quote: mobility.limitations }),
    },
  ]
}

/**
 * What was declared about the mind.
 * @param health The health profile to read.
 * @returns The rows, in the order the design reads them.
 */
function mindRows(health: HealthProfile): readonly FieldRow[] {
  const rows: FieldRow[] = []

  if (health.mind?.phobia !== undefined) {
    rows.push({ label: "Fobi", value: health.mind.phobia.details ?? noDescription })
  }
  if (health.mind?.diagnoses !== undefined) {
    rows.push({
      label: "Diagnos eller kognitiv funktionsnedsättning",
      value: [
        ...health.mind.diagnoses.kinds.map((kind) => diagnosisName(kind)),
        ...(health.mind.diagnoses.unlisted ?? []),
      ].join(", "),
      ...(health.mind.diagnoses.details !== undefined && {
        quote: health.mind.diagnoses.details,
      }),
    })
  }
  if (health.mind?.condition !== undefined) {
    rows.push({
      label: "Ångest, ätstörning eller PTSD",
      value: health.mind.condition.details ?? noDescription,
    })
  }
  return rows
}

/**
 * What was declared about the support that goes with it.
 * @param health The health profile to read.
 * @returns The rows, or none where nothing was declared.
 */
function supportRows(health: HealthProfile): readonly FieldRow[] {
  const rows: FieldRow[] = []

  if (health.support?.personalAssistant === true) {
    rows.push({ label: "Personlig assistent", value: "Ja" })
  }
  if (health.support?.unpredictability !== undefined) {
    rows.push({
      label: "Reagerar på oregelbundna måltider m.m.",
      value: health.support.unpredictability.wantsSupport ? "Ja – vill ha stöttning" : "Ja",
      ...(health.support.unpredictability.details !== undefined && {
        quote: health.support.unpredictability.details,
      }),
    })
  }

  return rows
}

/**
 * What was declared about medical equipment. A details-only declaration carries the
 * details as its value, and a "Ja" whose follow-ups are all blank still reads as one.
 * @param health The health profile to read.
 * @returns The row, or none where nothing was declared.
 */
function equipmentRows(health: HealthProfile): readonly FieldRow[] {
  const equipment = health.equipment
  if (equipment === undefined) {
    return []
  }
  const needs = [
    ...equipment.needs.map((need) => equipmentNeedName(need)),
    ...(equipment.unlisted ?? []),
  ].join(", ")
  if (needs === "") {
    return [{ label: "Medicinsk utrustning", value: equipment.details ?? noDescription }]
  }
  return [
    {
      label: "Medicinsk utrustning",
      value: needs,
      ...(equipment.details !== undefined && { quote: equipment.details }),
    },
  ]
}

/**
 * What was declared about an illness.
 * @param health The health profile to read.
 * @returns The row, or none where nothing was declared.
 */
function illnessRows(health: HealthProfile): readonly FieldRow[] {
  return health.condition === undefined
    ? []
    : [{ label: "Sjukdom", value: health.condition.details ?? noDescription }]
}

/**
 * The label-value rows a health profile fills on the person's page – only the facts that
 * were declared, in the order the design reads them.
 * @param health The health profile to read.
 * @returns The rows to draw.
 */
export function pageHealthRows(health: HealthProfile): readonly FieldRow[] {
  return [
    ...medicationRows(health),
    ...equipmentRows(health),
    ...mobilityRows(health),
    ...illnessRows(health),
    ...mindRows(health),
    ...supportRows(health),
  ]
}

/**
 * The same rows in the order a leader reaches for them in a hurry: what they take and
 * what they have before what they carry and how they feel.
 * @param health The health profile to read.
 * @returns The rows to draw.
 */
export function urgentHealthRows(health: HealthProfile): readonly FieldRow[] {
  return [
    ...medicationRows(health),
    ...illnessRows(health),
    ...equipmentRows(health),
    ...mobilityRows(health),
    ...mindRows(health),
    ...supportRows(health),
  ]
}

/**
 * The chip on a food allergy declared with nothing to show – no grade, no "Övriga", and no
 * description.
 */
export const blankAllergyLabel = "Matallergi angiven utan detaljer"

/**
 * One free-text answer about food, labeled with its question shortened.
 */
export interface FoodText {
  /**
   * The question, shortened to a label.
   */
  readonly label: string
  /**
   * What they wrote, or the words for a "Ja" left undescribed.
   */
  readonly text: string
}

/**
 * The free-text answers about food, each absent where nothing was declared.
 */
export interface FoodTexts {
  /**
   * What they wrote about their food allergy.
   */
  readonly allergy?: FoodText
  /**
   * What they wrote about their diet.
   */
  readonly diet?: FoodText
  /**
   * The allergy that is not to food, which reads as one even where it was left undescribed.
   */
  readonly otherAllergy?: FoodText
}

/**
 * The free-text answers about food, worded the same wherever they are drawn and placed by
 * each surface in its own order.
 * @param health The health profile to read.
 * @returns The texts that were declared.
 */
export function foodTexts(health: HealthProfile): FoodTexts {
  return {
    ...(health.foodAllergy?.details !== undefined && {
      allergy: { label: "Beskriv din allergi(er)", text: health.foodAllergy.details },
    }),
    ...(health.diet?.details !== undefined && {
      diet: { label: "Beskriv din specialkost i detalj", text: health.diet.details },
    }),
    ...(health.otherAllergy !== undefined && {
      otherAllergy: {
        label: "Allvarligare allergi (ej födoämne)",
        text: health.otherAllergy.details ?? noDescription,
      },
    }),
  }
}
