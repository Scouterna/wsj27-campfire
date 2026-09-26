import { describe, expect, it } from "vitest"

import { ageOf, belonging, fullName, inReadingOrder, type Participant } from "./Participant"

/**
 * A person as a listing row converts to, overridable per case.
 */
function person(overrides: Partial<Participant> = {}): Participant {
  return {
    memberNo: "1300007",
    firstName: "Alva",
    lastName: "Axelsson",
    role: "deltagare",
    ...overrides,
  }
}

describe("a participant's name", () => {
  it("reads as first name then last name", () => {
    expect(fullName(person())).toBe("Alva Axelsson")
  })

  it("keeps both given names of somebody who has two", () => {
    expect(fullName(person({ firstName: "Anna Karin", lastName: "Berg" }))).toBe("Anna Karin Berg")
  })
})

describe("where a participant belongs", () => {
  it("names a deltagare's unit by number", () => {
    expect(belonging(person({ unitNumber: 3 }))).toBe("Avdelning 3")
  })

  it("names a ledare's unit the same way", () => {
    expect(belonging(person({ unitNumber: 3, role: "ledare" }))).toBe("Avdelning 3")
  })

  it("places an IST member in the IST, whatever the service sent as their troop", () => {
    // The participants service sends an empty troop for every IST member, so the number
    // that would be a unit is absent.
    expect(belonging(person({ role: "ist" }))).toBe("IST")
  })

  it("places the contingent management in the contingent", () => {
    expect(belonging(person({ role: "kontingentledning" }))).toBe("Kontingenten")
  })

  it("places a deltagare the units do not hold in the contingent too", () => {
    expect(belonging(person({ role: "deltagare" }))).toBe("Kontingenten")
    expect(belonging(person({ role: "ledare" }))).toBe("Kontingenten")
  })
})

describe("reading order", () => {
  it("orders by name alone, whatever the unit or the role", () => {
    const ordered = inReadingOrder([
      person({ memberNo: "c", role: "kontingentledning", firstName: "Cecilia" }),
      person({ memberNo: "b", unitNumber: 2, role: "ledare", firstName: "Bertil" }),
      person({ memberNo: "a", unitNumber: 1, role: "deltagare", firstName: "Anna" }),
    ])

    expect(ordered.map((one) => one.memberNo)).toEqual(["a", "b", "c"])
  })

  it("sorts by name with Swedish collation", () => {
    const ordered = inReadingOrder([
      person({ memberNo: "o", unitNumber: 1, firstName: "Örjan" }),
      person({ memberNo: "aa", unitNumber: 1, firstName: "Åsa" }),
      person({ memberNo: "ae", unitNumber: 1, firstName: "Ärla" }),
      person({ memberNo: "a", unitNumber: 1, firstName: "Anna" }),
      person({ memberNo: "z", unitNumber: 1, firstName: "Zara" }),
    ])

    // Å, Ä, and Ö sort after Z in Swedish, in that order – a default sort would put all
    // three before Zara.
    expect(ordered.map((one) => one.memberNo)).toEqual(["a", "z", "aa", "ae", "o"])
  })

  it("sorts by the family name when the given names match", () => {
    const ordered = inReadingOrder([
      person({ memberNo: "b", unitNumber: 1, firstName: "Anna", lastName: "Berg" }),
      person({ memberNo: "a", unitNumber: 1, firstName: "Anna", lastName: "Andersson" }),
    ])

    expect(ordered.map((one) => one.memberNo)).toEqual(["a", "b"])
  })

  it("leaves the caller's array untouched", () => {
    const people = [
      person({ memberNo: "b", unitNumber: 2 }),
      person({ memberNo: "a", unitNumber: 1 }),
    ]

    inReadingOrder(people)

    expect(people.map((one) => one.memberNo)).toEqual(["b", "a"])
  })
})

describe("how old a person is", () => {
  it("counts whole years, before and after the birthday", () => {
    const person27 = person({ birthDate: "2013-07-30" })

    expect(ageOf(person27, new Date("2027-07-29T00:00:00Z"))).toBe(13)
    expect(ageOf(person27, new Date("2027-07-30T00:00:00Z"))).toBe(14)
  })

  it("answers nothing for an absent or unreadable birth date", () => {
    expect(ageOf(person({}), new Date("2027-07-30T00:00:00Z"))).toBeUndefined()
    expect(ageOf(person({ birthDate: "sommaren -95" }), new Date())).toBeUndefined()
  })

  it("answers nothing for a birth date in the future", () => {
    expect(ageOf(person({ birthDate: "2030-01-01" }), new Date("2027-01-01"))).toBeUndefined()
  })
})
