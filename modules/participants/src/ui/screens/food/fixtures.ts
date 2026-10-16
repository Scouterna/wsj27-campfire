import type { HealthProfile } from "../../../model/HealthProfile"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { unitNumbered } from "../../../model/Unit"

/**
 * The unit this screen's stories are told about – unit 3, with an allergen graded at
 * every grade, a person graded on several allergens, a food allergy left ungraded with and
 * without a description, and the special diets, beside people with nothing to declare.
 * They live here rather than in the module's shared fixtures because they exist to
 * exercise this screen.
 */

/**
 * The unit the stories show.
 */
export const foodUnitNumber = 3

const vaccinations = {
  childhoodProgram: true,
  diphtheria: { kind: "notGiven" },
  tetanus: { kind: "notGiven" },
} as const

/**
 * One person of the unit, with the health answers given, or withheld when given none.
 * @param memberNo The person's number within the fixture, unique to them.
 * @param name Their given name and family name.
 * @param role What they are in the unit.
 * @param health Their health answers beside the vaccinations, or nothing for withheld.
 * @returns Their record.
 */
function member(
  memberNo: number,
  name: string,
  role: "deltagare" | "ledare",
  health?: Omit<HealthProfile, "vaccinations">,
): ParticipantDetail {
  const [firstName = "", lastName = ""] = name.split(" ", 2)
  return {
    contact: { email: "", emergencyContacts: [], phone: "", relatives: [] },
    firstName,
    lastName,
    memberNo: String(1_700_000 + memberNo),
    notes: [],
    role,
    unit: unitNumbered(foodUnitNumber),
    ...(health !== undefined && { health: { ...health, vaccinations } }),
  }
}

/**
 * The unit's deltagare, every one of them readable.
 */
const deltagare: readonly ParticipantDetail[] = [
  member(1, "Ester Dahl", "deltagare", {
    diet: { sort: "vegetarian" },
    foodAllergy: {
      details:
        "Anafylaktisk reaktion mot nötter även vid spår – har två adrenalinpennor. Celiaki, så inget som tillagats i samma kastrull som pasta.",
      severities: [
        { allergen: "nuts", severity: 5 },
        { allergen: "gluten", severity: 4 },
        { allergen: "lactose", severity: 3 },
      ],
    },
  }),
  member(2, "Filip Hall", "deltagare", {}),
  member(3, "Alva Nyström", "deltagare", {
    foodAllergy: {
      details: "Lite laktos går bra, välj laktosfri mjölk.",
      severities: [{ allergen: "lactose", severity: 2 }],
    },
  }),
  member(4, "Noah Berglund", "deltagare", {
    foodAllergy: {
      details: "Celiaki, mycket känslig. Separat skärbräda och bröd i egen påse.",
      severities: [{ allergen: "gluten", severity: 5 }],
    },
  }),
  member(5, "Vera Lindqvist", "deltagare", { diet: { sort: "vegetarian" } }),
  member(6, "Elliot Ekman", "deltagare", {
    foodAllergy: {
      details:
        "Allvarlig allergi mot jordnötter och alla trädnötter. Adrenalinpenna finns alltid med.",
      severities: [
        { allergen: "nuts", severity: 5 },
        { allergen: "egg", severity: 4 },
      ],
    },
  }),
  member(7, "Maja Sandberg", "deltagare", { diet: { sort: "vegan" } }),
  member(8, "Melvin Ros", "deltagare", {
    foodAllergy: { severities: [{ allergen: "lactose", severity: 3 }] },
  }),
  member(9, "Ellen Torp", "deltagare", {
    foodAllergy: {
      details: "Klåda i munnen av hasselnötter och mandel. Jordnötter går bra.",
      severities: [{ allergen: "nuts", severity: 3 }],
    },
  }),
  member(10, "Signe Palm", "deltagare", {
    diet: { details: "Äter inte fläskkött.", sort: "other" },
  }),
  member(11, "Tuva Ek", "deltagare", {
    foodAllergy: { details: "Reagerar på kiwi och ananas.", severities: [] },
  }),
  member(12, "Vidar Holm", "deltagare", { foodAllergy: { severities: [] } }),
  member(13, "Iris Lund", "deltagare", {
    foodAllergy: {
      details: "Tål ägg i bakverk men inte kokt eller stekt ägg.",
      severities: [{ allergen: "egg", severity: 2 }],
    },
  }),
]

/**
 * The whole unit as the health team reads it, its leaders' answers included.
 */
export const foodUnitForHealthTeam: readonly ParticipantDetail[] = [
  ...deltagare,
  member(20, "Karin Melin", "ledare", {
    foodAllergy: {
      details: "Får klåda i halsen och svårt att andas. Har antihistamin och adrenalinpenna.",
      severities: [{ allergen: "nuts", severity: 4 }],
    },
  }),
  member(21, "Petter Ask", "ledare", { diet: { sort: "halal" } }),
]

/**
 * The same unit as one of its leaders reads it, with the leaders' answers withheld.
 */
export const foodUnitForLeader: readonly ParticipantDetail[] = [
  ...deltagare,
  member(20, "Karin Melin", "ledare"),
  member(21, "Petter Ask", "ledare"),
]

/**
 * A unit where nobody declared a diet or a food allergy.
 */
export const foodUnitWithNothing: readonly ParticipantDetail[] = [
  member(2, "Filip Hall", "deltagare", {}),
  member(14, "Ture Bergh", "deltagare", { otherAllergy: "Björkpollen" }),
]
