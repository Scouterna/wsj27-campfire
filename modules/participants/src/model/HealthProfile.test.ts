import { describe, expect, it } from "vitest"

import {
  allergenName,
  dietName,
  isBlankAllergy,
  isUnremarkable,
  type HealthProfile,
  type Vaccinations,
} from "./HealthProfile"

const vaccinations: Vaccinations = {
  childhoodProgram: true,
  diphtheria: { kind: "given", year: 2019 },
  tetanus: { kind: "given", year: 2019 },
}

/**
 * A profile with nothing but the vaccinations everybody answers, overridable per case.
 */
function health(overrides: Partial<HealthProfile> = {}): HealthProfile {
  return { isHealthAnswered: true, vaccinations, ...overrides }
}

describe("naming a special diet", () => {
  it("gives the Swedish label", () => {
    expect(dietName("vegetarian")).toBe("Vegetarian")
    expect(dietName("hinduNoBeef")).toBe("Hindu – inget nötkött")
    expect(dietName("other")).toBe("Annat")
  })
})

describe("naming an allergen", () => {
  it("gives the Swedish label", () => {
    expect(allergenName("nuts")).toBe("Nötter")
    expect(allergenName("milkProtein")).toBe("Mjölkprotein")
    expect(allergenName("other")).toBe("Övriga")
  })
})

describe("a food allergy declared blank", () => {
  it("is a yes with nothing graded, ticked, or written", () => {
    expect(isBlankAllergy({ severities: [] })).toBe(true)
  })

  it("stops being blank on anything beside the yes", () => {
    expect(isBlankAllergy({ severities: [{ allergen: "nuts", severity: 2 }] })).toBe(false)
    expect(isBlankAllergy({ hasOther: true, severities: [] })).toBe(false)
    expect(isBlankAllergy({ details: "Kiwi", severities: [] })).toBe(false)
  })
})

describe("an unremarkable health profile", () => {
  it("is one with nothing beyond the vaccinations", () => {
    expect(isUnremarkable(health())).toBe(true)
  })

  it("stops being unremarkable when any optional part is present", () => {
    expect(isUnremarkable(health({ diet: { sort: "vegan" } }))).toBe(false)
    expect(
      isUnremarkable(health({ foodAllergy: { severities: [{ allergen: "nuts", severity: 5 }] } })),
    ).toBe(false)
    expect(isUnremarkable(health({ otherAllergy: { details: "Pollen" } }))).toBe(false)
    expect(isUnremarkable(health({ medication: { details: "Levaxin" } }))).toBe(false)
    expect(isUnremarkable(health({ condition: { details: "Astma" } }))).toBe(false)
    expect(isUnremarkable(health({ equipment: { needs: ["cpapCharging"] } }))).toBe(false)
    expect(isUnremarkable(health({ mobility: { aids: ["cane"] } }))).toBe(false)
    expect(isUnremarkable(health({ mind: { phobia: { details: "Getingar" } } }))).toBe(false)
    expect(isUnremarkable(health({ support: { personalAssistant: true } }))).toBe(false)
  })

  it("stops being unremarkable on a yes with nothing written", () => {
    expect(isUnremarkable(health({ foodAllergy: { hasOther: true, severities: [] } }))).toBe(false)
    expect(isUnremarkable(health({ otherAllergy: {} }))).toBe(false)
    expect(isUnremarkable(health({ condition: {} }))).toBe(false)
    expect(isUnremarkable(health({ medication: {} }))).toBe(false)
    expect(isUnremarkable(health({ mind: { condition: {} } }))).toBe(false)
  })

  it("stays unremarkable on an explicit no to food allergies", () => {
    expect(isUnremarkable(health({ deniesFoodAllergy: true }))).toBe(true)
  })

  it("is not unremarkable while a health question has no answer", () => {
    expect(isUnremarkable({ vaccinations })).toBe(false)
  })

  it("does not count the vaccination answers against it", () => {
    // Boosters render in their own card, so even an unanswered one leaves the
    // "Inga hälsoanmärkningar" chip in place.
    const unanswered: Vaccinations = {
      childhoodProgram: false,
      diphtheria: { kind: "notGiven" },
      tetanus: { kind: "unanswered" },
    }

    expect(isUnremarkable(health({ vaccinations: unanswered }))).toBe(true)
  })
})
