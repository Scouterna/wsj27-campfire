import { describe, expect, it } from "vitest"

import { careOf, seriousAllergies, worstFirst } from "./Care"
import type { HealthProfile } from "./HealthProfile"

/**
 * A health profile that declares nothing, overridable per case.
 */
function health(overrides: Partial<HealthProfile> = {}): HealthProfile {
  return {
    vaccinations: {
      childhoodProgram: true,
      diphtheria: { kind: "notGiven" },
      tetanus: { kind: "notGiven" },
    },
    ...overrides,
  }
}

/**
 * A profile with one nut allergy, graded.
 */
function graded(severity: 2 | 3 | 4 | 5): HealthProfile {
  return health({ foodAllergy: { severities: [{ allergen: "nuts", severity }] } })
}

describe("the care a person needs", () => {
  it("is nothing for somebody who declared nothing, or whose answers are not ours", () => {
    expect(careOf(health(), [])).toEqual({ needs: [] })
    expect(careOf(undefined, [])).toEqual({ needs: [] })
  })

  it("lists every need, the most urgent first", () => {
    const care = careOf(
      health({
        diet: { sort: "vegan" },
        medication: { details: "Insulin" },
        otherAllergy: { details: "Björkpollen" },
      }),
      [{ audience: "avdelningsledaren", text: "Blir lätt åksjuk" }],
    )

    expect(care.needs).toEqual(["allergy", "health", "diet"])
    expect(care).not.toHaveProperty("isSerious")
  })

  it("raises an allergy on the food allergy's every form, however little it says", () => {
    for (const foodAllergy of [
      { severities: [] },
      { hasOther: true as const, severities: [] },
      { details: "Kiwi", severities: [] },
    ]) {
      expect(careOf(health({ foodAllergy }), []).needs).toEqual(["allergy"])
    }
  })

  it("raises an allergy on another allergy declared with nothing written", () => {
    expect(careOf(health({ otherAllergy: {} }), []).needs).toEqual(["allergy"])
  })

  it("raises health on a yes with nothing written", () => {
    for (const blank of [
      { condition: {} },
      { medication: {} },
      { mind: { condition: {} } },
      { mind: { phobia: {} } },
    ]) {
      expect(careOf(health(blank), []).needs).toEqual(["health"])
    }
  })

  it("calls an allergy graded 4 or 5 serious, and one graded lower not", () => {
    expect(careOf(graded(4), []).isSerious).toBe(true)
    expect(careOf(graded(3), [])).not.toHaveProperty("isSerious")
  })

  it("calls nothing serious that carries no grade", () => {
    expect(
      careOf(health({ foodAllergy: { hasOther: true, severities: [] } }), []),
    ).not.toHaveProperty("isSerious")
  })

  it("raises health on any note it is handed", () => {
    expect(careOf(health(), [{ audience: "kontingentledningen", text: "Hej" }]).needs).toEqual([
      "health",
    ])
    expect(careOf(undefined, [{ audience: "avdelningsledaren", text: "Hej" }]).needs).toEqual([
      "health",
    ])
  })

  it("raises nothing on answers the sheet has nothing to say about", () => {
    for (const silent of [
      { support: { personalAssistant: false } },
      { support: {} },
      { mind: {} },
    ]) {
      expect(careOf(health(silent), []).needs).toEqual([])
    }
  })

  it("raises health on an assistant, and on the unpredictable", () => {
    for (const support of [
      { personalAssistant: true },
      { unpredictability: { wantsSupport: false } },
    ]) {
      expect(careOf(health({ support }), []).needs).toEqual(["health"])
    }
  })
})

describe("the serious allergies", () => {
  it("are the ones graded 4 or 5, the worst first", () => {
    const profile = health({
      foodAllergy: {
        severities: [
          { allergen: "lactose", severity: 3 },
          { allergen: "sesame", severity: 4 },
          { allergen: "nuts", severity: 5 },
        ],
      },
    })

    expect(seriousAllergies(profile)).toEqual([
      { allergen: "nuts", severity: 5 },
      { allergen: "sesame", severity: 4 },
    ])
  })

  it("are none where the health is not ours to read", () => {
    expect(seriousAllergies(undefined)).toEqual([])
  })

  it("keep the order of equal grades", () => {
    const severities = [
      { allergen: "egg", severity: 2 },
      { allergen: "fish", severity: 2 },
    ] as const

    expect(worstFirst(severities)).toEqual(severities)
  })
})
