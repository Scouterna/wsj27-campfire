import { describe, expect, it } from "vitest"

import { foodOverview } from "./food-overview"
import type { HealthProfile } from "./HealthProfile"
import type { ParticipantDetail } from "./ParticipantDetail"
import { unitNumbered } from "./Unit"

let next = 0

/**
 * One deltagare of unit 1 with the health answers given, or withheld when given none.
 */
function person(name: string, health?: Partial<HealthProfile>): ParticipantDetail {
  next += 1
  const [firstName = "", lastName = ""] = name.split(" ", 2)
  return {
    contact: { email: "", emergencyContacts: [], phone: "", relatives: [] },
    firstName,
    lastName,
    memberNo: String(next),
    notes: [],
    role: "deltagare",
    unit: unitNumbered(1),
    ...(health !== undefined && {
      health: {
        vaccinations: {
          childhoodProgram: true,
          diphtheria: { kind: "notGiven" },
          tetanus: { kind: "notGiven" },
        },
        ...health,
      },
    }),
  }
}

/**
 * The names of a list of people, to compare an order by.
 */
function names(people: readonly ParticipantDetail[]): readonly string[] {
  return people.map((entry) => `${entry.firstName} ${entry.lastName}`)
}

describe("a unit's food needs, by allergen", () => {
  it("gives every graded allergen a group holding exactly its graders", () => {
    const ester = person("Ester Dahl", {
      diet: { sort: "vegetarian" },
      foodAllergy: {
        severities: [
          { allergen: "nuts", severity: 5 },
          { allergen: "egg", severity: 4 },
        ],
      },
    })
    const ivar = person("Ivar Forsberg", {
      foodAllergy: { severities: [{ allergen: "nuts", severity: 3 }] },
    })
    const otto = person("Otto Lind", {})

    const overview = foodOverview([otto, ivar, ester])

    expect(overview.allergens.map((group) => group.allergen)).toEqual(["nuts", "egg"])
    expect(overview.allergens[0]?.people).toEqual([
      { person: ester, severity: 5 },
      { person: ivar, severity: 3 },
    ])
    expect(overview.allergens[1]?.people).toEqual([{ person: ester, severity: 4 }])
  })

  it("splits a group by grade, the highest first, leaving out a grade nobody has", () => {
    const overview = foodOverview([
      person("Alva A", { foodAllergy: { severities: [{ allergen: "gluten", severity: 2 }] } }),
      person("Bo B", { foodAllergy: { severities: [{ allergen: "gluten", severity: 5 }] } }),
      person("Cecilia C", { foodAllergy: { severities: [{ allergen: "gluten", severity: 2 }] } }),
    ])

    expect(overview.allergens[0]?.split).toEqual([
      { count: 1, severity: 5 },
      { count: 2, severity: 2 },
    ])
  })

  it("orders the groups by people, most first, and a tie by the allergen's Swedish name", () => {
    const overview = foodOverview([
      person("Alva A", {
        foodAllergy: {
          severities: [
            { allergen: "egg", severity: 2 },
            { allergen: "fish", severity: 2 },
            { allergen: "shellfish", severity: 2 },
          ],
        },
      }),
      person("Bo B", { foodAllergy: { severities: [{ allergen: "shellfish", severity: 2 }] } }),
    ])

    // Ägg collates after Fisk in Swedish, where it would come first by code point.
    expect(overview.allergens.map((group) => group.allergen)).toEqual(["shellfish", "fish", "egg"])
  })

  it("orders a group's people by grade, and a tie by name", () => {
    const overview = foodOverview([
      person("Örjan Ö", { foodAllergy: { severities: [{ allergen: "nuts", severity: 4 }] } }),
      person("Bo B", { foodAllergy: { severities: [{ allergen: "nuts", severity: 4 }] } }),
      person("Ada A", { foodAllergy: { severities: [{ allergen: "nuts", severity: 2 }] } }),
    ])

    expect(names(overview.allergens[0]?.people.map((entry) => entry.person) ?? [])).toEqual([
      "Bo B",
      "Örjan Ö",
      "Ada A",
    ])
  })
})

describe("a unit's food needs, by diet", () => {
  it("gives every diet followed a group, most people first, a tie in the registration's order", () => {
    const overview = foodOverview([
      person("Alva A", { diet: { sort: "other", details: "Ingen fläsk" } }),
      person("Bo B", { diet: { sort: "vegan" } }),
      person("Cecilia C", { diet: { sort: "halal" } }),
      person("David D", { diet: { sort: "halal" } }),
      person("Erik E", {}),
    ])

    expect(overview.diets.map((group) => group.sort)).toEqual(["halal", "vegan", "other"])
    expect(names(overview.diets[0]?.people ?? [])).toEqual(["Cecilia C", "David D"])
  })
})

describe("a food allergy without a grade", () => {
  it("is listed on its own, with or without a description, and in no allergen's group", () => {
    const astrid = person("Astrid Forsberg", { foodAllergy: { severities: [] } })
    const otto = person("Otto Lind", {
      foodAllergy: { details: "Reagerar på kiwi.", severities: [] },
    })

    const overview = foodOverview([otto, astrid])

    expect(overview.ungraded).toEqual([astrid, otto])
    expect(overview.allergens).toEqual([])
  })

  it("leaves out an allergy that is not to food, and someone with nothing to say", () => {
    const overview = foodOverview([
      person("Alva A", { otherAllergy: "Björkpollen" }),
      person("Bo B", { medication: { details: "Insulin" } }),
    ])

    expect(overview).toEqual({ allergens: [], diets: [], ungraded: [], withheld: 0 })
  })
})

describe("the people withheld from the reader", () => {
  it("are counted, and in no group", () => {
    const overview = foodOverview([
      person("Lars Lindberg"),
      person("Hanna Hellström"),
      person("Ester Dahl", { diet: { sort: "vegetarian" } }),
    ])

    expect(overview.withheld).toBe(2)
    expect(names(overview.diets.flatMap((group) => group.people))).toEqual(["Ester Dahl"])
  })
})
