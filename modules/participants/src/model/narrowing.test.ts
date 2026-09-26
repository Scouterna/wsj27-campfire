import { describe, expect, it } from "vitest"

import { matches, narrow } from "./narrowing"
import type { Participant } from "./Participant"

/**
 * A person as a listing row converts to, overridable per case. The unit is added where a
 * case needs one, so the contingent's unitless people are as easy to write as the rest.
 */
function person(overrides: Partial<Participant> = {}): Participant {
  return {
    memberNo: "1100101",
    firstName: "Åsa",
    lastName: "Hällström",
    role: "deltagare",
    ...overrides,
  }
}

/**
 * A lookup that knows one unit: 2 is Myran, and nothing else is named.
 * @param unitNumber The unit asked about.
 * @returns The name, for the one unit that has one.
 */
function nameOf(unitNumber: number): string | undefined {
  return unitNumber === 2 ? "Myran" : undefined
}

describe("matching one person against a query", () => {
  const asa = person({ unitNumber: 1 })

  it("matches the full name, however it is capitalized", () => {
    expect(matches(asa, "åsa")).toBe(true)
    expect(matches(asa, "ÅSA HÄLLSTRÖM")).toBe(true)
  })

  it("finds a name through its diacritics", () => {
    expect(matches(asa, "Asa")).toBe(true)
    expect(matches(asa, "Hallstrom")).toBe(true)
  })

  it("matches a query that carries diacritics the name does not", () => {
    // Folding runs on both sides, so the reader's keyboard never decides the answer.
    expect(matches(person({ firstName: "Asa", lastName: "Hallstrom" }), "Åsa")).toBe(true)
  })

  it("never matches the role words or the member number", () => {
    // The chips narrow by role – a search matching "ist" would be a second, accidental
    // filter – and a member number is nothing a reader searches people by, so a
    // digits-only query is a unit number instead.
    expect(matches(person({ role: "ist" }), "ist")).toBe(false)
    expect(matches(asa, "1100101")).toBe(false)
  })

  it("matches a digits-only query against the unit number, exactly", () => {
    expect(matches(person({ unitNumber: 2 }), "2")).toBe(true)
    // Exactly, so "2" never sweeps in every unit that contains the digit.
    expect(matches(person({ unitNumber: 28 }), "2")).toBe(false)
    expect(matches(person({ role: "ist" }), "2")).toBe(false)
  })

  it("matches the unit's name through the handed-in lookup", () => {
    expect(matches(person({ unitNumber: 2 }), "myran", nameOf)).toBe(true)
    expect(matches(person({ unitNumber: 3 }), "myran", nameOf)).toBe(false)
    // Without a lookup no unit has a name, and the query falls through to no match.
    expect(matches(person({ unitNumber: 2 }), "myran")).toBe(false)
  })

  it("matches a management member's funktion by its label", () => {
    const anna = person({ role: "kontingentledning", funktion: "halsosupport" })

    expect(matches(anna, "hälso")).toBe(true)
    expect(matches(anna, "halso")).toBe(true)
    expect(matches(person({ role: "kontingentledning" }), "hälso")).toBe(false)
  })

  it("matches everybody on an empty or whitespace query", () => {
    expect(matches(asa, "")).toBe(true)
    expect(matches(asa, " ".repeat(3))).toBe(true)
  })

  it("ignores the whitespace around a query", () => {
    expect(matches(asa, "  hällström  ")).toBe(true)
  })

  it("does not match somebody the query names nothing of", () => {
    expect(matches(asa, "Lindberg")).toBe(false)
  })
})

describe("narrowing a list", () => {
  const people = [
    person({
      memberNo: "1",
      firstName: "Lars",
      lastName: "Lindberg",
      role: "ledare",
      unitNumber: 1,
    }),
    person({ memberNo: "2", firstName: "Ester", lastName: "Dahl", unitNumber: 1 }),
    person({ memberNo: "3", firstName: "Ivar", lastName: "Ek", role: "ist" }),
    person({ memberNo: "4", firstName: "Pernilla", lastName: "Palm", role: "kontingentledning" }),
    person({ memberNo: "5", firstName: "Lisa", lastName: "Lind", unitNumber: 2 }),
  ]

  it("keeps everybody when nothing narrows", () => {
    expect(narrow(people, "", undefined)).toEqual(people)
    expect(narrow(people, " ".repeat(3), undefined)).toEqual(people)
  })

  it("keeps only the chosen role", () => {
    expect(narrow(people, "", "deltagare").map((one) => one.memberNo)).toEqual(["2", "5"])
    expect(narrow(people, "", "ledare").map((one) => one.memberNo)).toEqual(["1"])
    expect(narrow(people, "", "ist").map((one) => one.memberNo)).toEqual(["3"])
  })

  it("reads the cmt filter as the contingent management role", () => {
    expect(narrow(people, "", "cmt").map((one) => one.memberNo)).toEqual(["4"])
  })

  it("applies the search and the role together", () => {
    // "Lind" alone finds the leader and the deltagare; the chip decides which stays.
    expect(narrow(people, "Lind", undefined).map((one) => one.memberNo)).toEqual(["1", "5"])
    expect(narrow(people, "Lind", "deltagare").map((one) => one.memberNo)).toEqual(["5"])
  })

  it("keeps the order it was handed", () => {
    const reversed = people.toReversed()

    expect(narrow(reversed, "Lind", undefined).map((one) => one.memberNo)).toEqual(["5", "1"])
  })

  it("answers an empty list when nothing matches", () => {
    expect(narrow(people, "Ingen alls", undefined)).toEqual([])
  })
})
