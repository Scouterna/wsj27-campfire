import { describe, expect, it } from "vitest"

import { careCounts, careOf } from "./Care"
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
        otherAllergy: "Björkpollen",
      }),
      [{ audience: "avdelningsledaren", text: "Blir lätt åksjuk" }],
    )

    expect(care.needs).toEqual(["allergy", "health", "support", "diet"])
    expect(care).not.toHaveProperty("isSerious")
  })

  it("calls an allergy graded 4 or 5 serious, and one graded lower not", () => {
    expect(careOf(graded(4), []).isSerious).toBe(true)
    expect(careOf(graded(3), [])).not.toHaveProperty("isSerious")
  })

  it("counts a note to the management alone as no need of the unit's", () => {
    expect(careOf(health(), [{ audience: "kontingentledningen", text: "Hej" }]).needs).toEqual([])
  })
})

describe("weighing a group's care", () => {
  it("counts each need once per person, and leaves out what nobody needs", () => {
    const counts = careCounts([
      { needs: ["allergy", "diet"] },
      { needs: ["allergy"] },
      { needs: [] },
    ])

    expect(counts).toEqual(
      new Map([
        ["allergy", 2],
        ["diet", 1],
      ]),
    )
  })
})
