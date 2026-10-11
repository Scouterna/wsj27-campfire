import { describe, expect, it } from "vitest"

import {
  ageOf,
  belonging,
  fullName,
  inReadingOrder,
  whereFrom,
  type Participant,
} from "./Participant"

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
  it("names a deltagare's unit by number and name", () => {
    expect(belonging(person({ unit: { name: "Ekorren", number: 3 } }))).toBe(
      "Avdelning 3 · Ekorren",
    )
  })

  it("names a ledare's unit the same way, and by number alone when it has no name", () => {
    expect(belonging(person({ role: "ledare", unit: { number: 3 } }))).toBe("Avdelning 3")
  })

  it("places an IST member by their patrol, by number and name", () => {
    expect(belonging(person({ istPatrol: { name: "Tordyvel", number: 7 }, role: "ist" }))).toBe(
      "Patrull 7 · Tordyvel",
    )
  })

  it("says so when an IST member is in no patrol", () => {
    expect(belonging(person({ role: "ist" }))).toBe("Ingen patrull")
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
      person({ memberNo: "b", unit: { number: 2 }, role: "ledare", firstName: "Bertil" }),
      person({ memberNo: "a", unit: { number: 1 }, role: "deltagare", firstName: "Anna" }),
    ])

    expect(ordered.map((one) => one.memberNo)).toEqual(["a", "b", "c"])
  })

  it("sorts by name with Swedish collation", () => {
    const ordered = inReadingOrder([
      person({ memberNo: "o", unit: { number: 1 }, firstName: "Örjan" }),
      person({ memberNo: "aa", unit: { number: 1 }, firstName: "Åsa" }),
      person({ memberNo: "ae", unit: { number: 1 }, firstName: "Ärla" }),
      person({ memberNo: "a", unit: { number: 1 }, firstName: "Anna" }),
      person({ memberNo: "z", unit: { number: 1 }, firstName: "Zara" }),
    ])

    // Å, Ä, and Ö sort after Z in Swedish, in that order – a default sort would put all
    // three before Zara.
    expect(ordered.map((one) => one.memberNo)).toEqual(["a", "z", "aa", "ae", "o"])
  })

  it("sorts by the family name when the given names match", () => {
    const ordered = inReadingOrder([
      person({ memberNo: "b", unit: { number: 1 }, firstName: "Anna", lastName: "Berg" }),
      person({ memberNo: "a", unit: { number: 1 }, firstName: "Anna", lastName: "Andersson" }),
    ])

    expect(ordered.map((one) => one.memberNo)).toEqual(["a", "b"])
  })

  it("leaves the caller's array untouched", () => {
    const people = [
      person({ memberNo: "b", unit: { number: 2 } }),
      person({ memberNo: "a", unit: { number: 1 } }),
    ]

    inReadingOrder(people)

    expect(people.map((one) => one.memberNo)).toEqual(["b", "a"])
  })
})

describe("how old a person is", () => {
  it("counts whole years, before and after the birthday", () => {
    const person27 = person({ birthDate: "2013-07-30" })

    expect(ageOf(person27, new Date(2027, 6, 29, 23, 59))).toBe(13)
    expect(ageOf(person27, new Date(2027, 6, 30, 0, 1))).toBe(14)
  })

  it("answers nothing for an absent or unreadable birth date", () => {
    expect(ageOf(person({}), new Date(2027, 6, 30))).toBeUndefined()
    expect(ageOf(person({ birthDate: "sommaren -95" }), new Date())).toBeUndefined()
    // A day the month does not have, which the parser would roll into the next month.
    expect(ageOf(person({ birthDate: "2010-02-30" }), new Date(2027, 6, 30))).toBeUndefined()
  })

  it("answers nothing for a birth date in the future", () => {
    expect(ageOf(person({ birthDate: "2030-01-01" }), new Date(2027, 0, 1))).toBeUndefined()
  })
})

describe("where a participant comes from", () => {
  it("joins the scoutkår and the home town, in that order", () => {
    const person1 = person({ homeTown: "Göteborg", memberGroup: "Mockåsens scoutkår" })

    expect(whereFrom(person1)).toBe("Mockåsens scoutkår · Göteborg")
  })

  it("says whichever of the two there is", () => {
    expect(whereFrom(person({ memberGroup: "Mockåsens scoutkår" }))).toBe("Mockåsens scoutkår")
    expect(whereFrom(person({ homeTown: "Bryssel (Belgien)" }))).toBe("Bryssel (Belgien)")
  })

  it("says nothing when there is neither", () => {
    expect(whereFrom(person())).toBeUndefined()
  })
})
