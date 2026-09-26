import { describe, expect, it } from "vitest"

import { toParticipant, toParticipants } from "./ParticipantDto"

/**
 * A listing row as the participants service sends it, overridable per case – the mock's
 * own first leader, keys and all.
 */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Lars Lindberg",
    member_no: 1_100_101,
    born: "1995-07-16",
    sex: "Man",
    member_group: "Mockåsens scoutkår",
    email: "lars.lindberg@example.se",
    mobile: "070-719 56 23",
    member_type: "Avdelningsledare",
    participation_type: "Rundresa",
    access_level: "",
    troop: "1",
    contact_info: {},
    ...overrides,
  }
}

describe("reading one listing row", () => {
  it("reads the service's shape into the domain's", () => {
    expect(toParticipant(row())).toEqual({
      memberNo: "1100101",
      birthDate: "1995-07-16",
      email: "lars.lindberg@example.se",
      firstName: "Lars",
      lastName: "Lindberg",
      memberGroup: "Mockåsens scoutkår",
      phone: "070-719 56 23",
      role: "ledare",
      unitNumber: 1,
    })
  })

  it("prefers Scoutnet's own address to the registration's copy of it", () => {
    const contact = { "Information redan i Scoutnet": { email: "lars@example.org" } }

    expect(toParticipant(row({ contact_info: contact }))?.email).toBe("lars.lindberg@example.se")
  })

  it("falls back to the registration's copy when Scoutnet holds no address", () => {
    const contact = { "Information redan i Scoutnet": { email: "lars@example.org" } }

    expect(toParticipant(row({ contact_info: contact, email: " " }))?.email).toBe(
      "lars@example.org",
    )
  })

  it("reads the second address the registration asked for, which Scoutnet has no field for", () => {
    const contact = {
      "Information redan i Scoutnet": { alternateEmail: "lars.privat@example.org" },
    }

    expect(toParticipant(row({ contact_info: contact }))?.alternateEmail).toBe(
      "lars.privat@example.org",
    )
    expect(toParticipant(row())?.alternateEmail).toBeUndefined()
  })

  it("reads a missing or empty address as no address at all", () => {
    // The wire says null for a member without one, and the mock sends exactly that.
    const noEmail = JSON.parse('{"email": null}') as Record<string, unknown>
    const blankCopy = { "Information redan i Scoutnet": { email: "  " } }

    expect(toParticipant(row(noEmail))?.email).toBeUndefined()
    expect(toParticipant(row({ email: " " }))?.email).toBeUndefined()
    expect(toParticipant(row({ email: " ", contact_info: blankCopy }))?.email).toBeUndefined()
  })

  it("reads every address named around them, in the order the form asks for them", () => {
    const contact = {
      "Kontaktuppgifter närstående 1": {
        nextOfKin1Name: "Maria Ström",
        nextOfKin1Email: "maria@example.se",
      },
      "Kontaktuppgifter närstående 2": {
        nextOfKin2Name: "Björn Ström",
        nextOfKin2Email: "bjorn@example.se",
      },
      "Annan nödkontakt": {
        emergencyContact1Name: "Ylva Sandberg",
        emergencyContact1Email: "ylva@example.se",
        emergencyContact2Name: "Frans Sundqvist",
        emergencyContact2Email: "frans@example.se",
      },
    }

    expect(toParticipant(row({ contact_info: contact }))?.contactEmails).toEqual({
      emergencyContact1: "ylva@example.se",
      emergencyContact2: "frans@example.se",
      nextOfKin1: "maria@example.se",
      nextOfKin2: "bjorn@example.se",
    })
  })

  it("reads every number named around them, beside the addresses", () => {
    const contact = {
      "Kontaktuppgifter närstående 1": {
        nextOfKin1Name: "Maria Ström",
        nextOfKin1Phone: "070-123 45 67",
      },
      "Annan nödkontakt": {
        emergencyContact1Name: "Ylva Sandberg",
        emergencyContact1Email: "ylva@example.se",
        emergencyContact1Phone: "+46701112233",
      },
    }
    const person = toParticipant(row({ contact_info: contact }))

    expect(person?.contactPhones).toEqual({
      emergencyContact1: "+46701112233",
      nextOfKin1: "070-123 45 67",
    })
    expect(person?.contactEmails).toEqual({ emergencyContact1: "ylva@example.se" })
  })

  it("skips a contact without an address, and one without a name – as the detail does", () => {
    const contact = {
      "Kontaktuppgifter närstående 1": { nextOfKin1Name: "Maria Ström" },
      "Kontaktuppgifter närstående 2": {
        nextOfKin2Email: "bjorn@example.se",
        nextOfKin2Phone: "070-765 43 21",
      },
    }
    const person = toParticipant(row({ contact_info: contact }))

    expect(person?.contactEmails).toBeUndefined()
    expect(person?.contactPhones).toBeUndefined()
  })

  it("reads a row the service sent without contact answers", () => {
    const person = toParticipant(row({ contact_info: undefined }))

    expect(person?.contactEmails).toBeUndefined()
    expect(person?.contactPhones).toBeUndefined()
    expect(person?.email).toBe("lars.lindberg@example.se")
  })

  it("reads an empty member group as no scoutkår at all", () => {
    expect(toParticipant(row({ member_group: "" }))?.memberGroup).toBeUndefined()
  })

  it("accepts the member number as a string too – the service is not consistent", () => {
    expect(toParticipant(row({ member_no: "1100101" }))?.memberNo).toBe("1100101")
  })

  it("reads the last word of the name as the family name", () => {
    const person = toParticipant(row({ name: "Anna Karin Berg" }))

    expect(person?.firstName).toBe("Anna Karin")
    expect(person?.lastName).toBe("Berg")
  })

  it("maps every member type to its role", () => {
    expect(toParticipant(row({ member_type: "Deltagare" }))?.role).toBe("deltagare")
    expect(toParticipant(row({ member_type: "IST" }))?.role).toBe("ist")
    expect(toParticipant(row({ member_type: "Avdelningsledare" }))?.role).toBe("ledare")
    expect(toParticipant(row({ member_type: "Kontingentledning" }))?.role).toBe("kontingentledning")
  })

  it("leaves the unit unknown when the troop is empty", () => {
    // What the service sends for the contingent management and for every IST member.
    expect(toParticipant(row({ member_type: "IST", troop: "" }))?.unitNumber).toBeUndefined()
    expect(
      toParticipant(row({ member_type: "Kontingentledning", troop: "" }))?.unitNumber,
    ).toBeUndefined()
  })

  it("leaves the unit unknown when the troop is not a number", () => {
    expect(toParticipant(row({ troop: "Patrull 3" }))?.unitNumber).toBeUndefined()
  })

  it("drops a row without a member number – it cannot be linked to", () => {
    expect(toParticipant(row({ member_no: undefined }))).toBeUndefined()
    expect(toParticipant(row({ member_no: "" }))).toBeUndefined()
  })

  it("drops a row without a usable name", () => {
    const blank = " ".repeat(3)

    expect(toParticipant(row({ name: blank }))).toBeUndefined()
    expect(toParticipant(row({ name: 42 }))).toBeUndefined()
  })

  it("drops a row whose member type this build does not know", () => {
    // A type invented by a later version of the service must not reach the domain – the
    // screens switch on the role exhaustively.
    expect(toParticipant(row({ member_type: "Funktionär" }))).toBeUndefined()
  })

  it("reads the home town, trimmed, in the case it was typed", () => {
    expect(toParticipant(row({ city: "  GÖTEBORG " }))?.homeTown).toBe("GÖTEBORG")
    expect(toParticipant(row({ city: "Bryssel (Belgien)" }))?.homeTown).toBe("Bryssel (Belgien)")
  })

  it("reads a blank, null, or missing home town as none", () => {
    // A row without the key at all is the same absence as one with null in it, so the
    // field being there or not changes nothing about how a row is read.
    expect(toParticipant(row({ city: " " }))).not.toHaveProperty("homeTown")
    // eslint-disable-next-line unicorn/no-null -- a missing town is null on the wire
    expect(toParticipant(row({ city: null }))).not.toHaveProperty("homeTown")
    expect(toParticipant(row({ city: 42 }))).not.toHaveProperty("homeTown")
    expect(toParticipant(row())).not.toHaveProperty("homeTown")
  })

  it("carries the current phone number, unformatted, for the export", () => {
    expect(toParticipant(row({ mobile: "+46708277486" }))?.phone).toBe("+46708277486")
  })

  it("falls back to the registration's copy of the number when Scoutnet holds none", () => {
    const contact = { "Information redan i Scoutnet": { mobilePhone: "070-111 22 33" } }

    // eslint-disable-next-line unicorn/no-null -- a missing mobile number is null on the wire
    expect(toParticipant(row({ contact_info: contact, mobile: null }))?.phone).toBe("070-111 22 33")
  })

  it("carries no phone number where neither Scoutnet nor the registration holds one", () => {
    const blank = { "Information redan i Scoutnet": { mobilePhone: " " } }

    // eslint-disable-next-line unicorn/no-null -- as above
    expect(toParticipant(row({ contact_info: blank, mobile: null }))).not.toHaveProperty("phone")
    // A fellow leader's contact answers are withheld, and so is their number.
    expect(
      // eslint-disable-next-line unicorn/no-null -- as above
      toParticipant(row({ contact_info: undefined, mobile: null })),
    ).not.toHaveProperty("phone")
  })
})

describe("reading a listing", () => {
  it("keeps the readable rows and drops the rest", () => {
    const rows = [row(), { name: "No Number" }, row({ member_no: 42, name: "Eva Ek" })]

    expect(toParticipants(rows).map((person) => person.memberNo)).toEqual(["1100101", "42"])
  })

  it("reads anything that is not a list as empty", () => {
    expect(toParticipants({ detail: "Troop not found in project." })).toEqual([])
    expect(toParticipants(undefined)).toEqual([])
  })
})
