import { describe, expect, it } from "vitest"

import {
  allergenName,
  dietName,
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
  return { vaccinations, ...overrides }
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

describe("an unremarkable health profile", () => {
  it("is one with nothing beyond the vaccinations", () => {
    expect(isUnremarkable(health())).toBe(true)
  })

  it("stops being unremarkable when any optional part is present", () => {
    expect(isUnremarkable(health({ diet: { sort: "vegan" } }))).toBe(false)
    expect(
      isUnremarkable(health({ foodAllergy: { severities: [{ allergen: "nuts", severity: 5 }] } })),
    ).toBe(false)
    expect(isUnremarkable(health({ otherAllergy: "Pollen" }))).toBe(false)
    expect(isUnremarkable(health({ medication: { details: "Levaxin" } }))).toBe(false)
    expect(isUnremarkable(health({ condition: "Astma" }))).toBe(false)
    expect(isUnremarkable(health({ equipment: { needs: ["cpapCharging"] } }))).toBe(false)
    expect(isUnremarkable(health({ mobility: { aids: ["cane"] } }))).toBe(false)
    expect(isUnremarkable(health({ mind: { phobia: "Getingar" } }))).toBe(false)
    expect(isUnremarkable(health({ support: { personalAssistant: true } }))).toBe(false)
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
