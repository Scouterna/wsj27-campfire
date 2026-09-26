import { describe, expect, it } from "vitest"

import { contactSheet, contactSheetName } from "./contact-sheet"
import type { Participant } from "./Participant"

/**
 * One person in a list, overridable per case.
 */
function person(overrides: Partial<Participant> = {}): Participant {
  return {
    firstName: "Alva",
    lastName: "Ström",
    memberNo: "1100102",
    role: "deltagare",
    ...overrides,
  }
}

// The day every sheet here is made on, so an age is the same whenever and wherever the
// test runs.
const today = new Date(2027, 6, 30, 12)

/**
 * The sheet split back into rows, without the mark that tells Excel its encoding.
 * @param people The people to write.
 * @returns The rows, heading first.
 */
function rows(people: readonly Participant[]): string[] {
  return contactSheet(people, today).replace("\u{FEFF}", "").trimEnd().split("\r\n")
}

describe("the contact sheet", () => {
  it("opens with the byte order mark Excel needs to read it as UTF-8", () => {
    // Without it the headings arrive as "NÃ¤rstÃ¥ende", which is the whole reason the
    // mark is here – nothing else in the file depends on it.
    expect(contactSheet([], today)).toMatch(/^\u{FEFF}/u)
  })

  it("heads the columns in the registration's own words, who they are before the addresses", () => {
    expect(rows([])).toEqual([
      "Namn;Typ av anmälan;Ålder;Scoutkår;Hemort;Mobiltelefon;E-post;Alternativ e-post;" +
        "Närstående 1 telefon;Närstående 1 e-post;Närstående 2 telefon;Närstående 2 e-post;" +
        "Nödkontakt 1 telefon;Nödkontakt 1 e-post;Nödkontakt 2 telefon;Nödkontakt 2 e-post",
    ])
  })

  it("writes who a person is and how to call them, as their own page shows it", () => {
    const people = [
      person({
        birthDate: "2013-07-30",
        homeTown: "Göteborg",
        memberGroup: "Mockåsens scoutkår",
        phone: "+46708277486",
      }),
    ]

    expect(rows(people).at(1)).toBe(
      "Alva Ström;Deltagare;14;Mockåsens scoutkår;Göteborg;070-827 74 86;;;;;;;;;;",
    )
  })

  it("writes a number as the text the page shows, marked as text where Excel would run it", () => {
    const people = [
      person({ phone: "031-765 43 21" }),
      person({ phone: "+4712345678" }),
      person({ phone: "+47 412 34 567" }),
    ]

    expect(rows(people).map((row) => row.split(";", 6).at(5))).toEqual([
      "Mobiltelefon",
      "0317654321",
      "'+4712345678",
      "'+47 412 34 567",
    ])
  })

  it("writes anything Excel would run as a formula as the text it was typed as", () => {
    // Every column but the name is typed by whoever registered, a contact's number
    // included, and a leader opening the sheet must never run what they typed.
    const people = [
      person({
        contactPhones: { nextOfKin1: '=HYPERLINK("https://example.org")' },
        firstName: "=1+1",
        homeTown: "@SUM(A1)",
        lastName: "",
        memberGroup: "-2+3",
      }),
    ]

    expect(rows(people).at(1)).toBe(
      `'=1+1;Deltagare;;'-2+3;'@SUM(A1);;;;"'=HYPERLINK(""https://example.org"")";;;;;;;`,
    )
  })

  it("counts the age to the day of the export, for every role", () => {
    const people = [
      person({ birthDate: "2013-07-31" }),
      person({ birthDate: "1982-06-03", role: "kontingentledning" }),
    ]

    expect(rows(people).map((row) => row.split(";", 3).at(2))).toEqual(["Ålder", "13", "45"])
  })

  it("leaves an age empty rather than guessing one", () => {
    const people = [person({ birthDate: "2030-01-01" }), person({ birthDate: "sommaren -95" })]

    expect(rows(people).map((row) => row.split(";", 3).at(2))).toEqual(["Ålder", "", ""])
  })

  it("writes a person's addresses under the slot each was named in", () => {
    const people = [
      person({
        alternateEmail: "alva@example.org",
        contactEmails: {
          emergencyContact2: "frans@example.se",
          nextOfKin1: "maria@example.se",
        },
        email: "alva@example.se",
      }),
    ]

    expect(rows(people).at(1)).toBe(
      "Alva Ström;Deltagare;;;;;alva@example.se;alva@example.org;;maria@example.se;;;;;;frans@example.se",
    )
  })

  it("writes each contact's number beside their address, shaped as a person's own is", () => {
    const people = [
      person({
        contactEmails: { nextOfKin1: "maria@example.se" },
        contactPhones: { emergencyContact1: "031-765 43 21", nextOfKin1: "+46708277486" },
      }),
    ]

    expect(rows(people).at(1)).toBe(
      "Alva Ström;Deltagare;;;;;;;070-827 74 86;maria@example.se;;;0317654321;;;",
    )
  })

  it("keeps a row for whoever has nothing else to fill it with", () => {
    // A blank cell is what says somebody is missing a value – leaving them out would say
    // they are not in the list.
    expect(rows([person()]).at(1)).toBe("Alva Ström;Deltagare;;;;;;;;;;;;;;")
  })

  it("keeps the list's order, one row per person", () => {
    const people = [person({ firstName: "Beata" }), person({ firstName: "Alfred" })]

    expect(rows(people).map((row) => row.split(";", 1).at(0))).toEqual([
      "Namn",
      "Beata Ström",
      "Alfred Ström",
    ])
  })

  it("quotes a value that would otherwise end its cell early", () => {
    // A separator in a name would shift every column after it, and a quote inside a
    // quoted cell has to be doubled to stay part of the value.
    const people = [person({ firstName: 'Alva "Ally";', lastName: "Ström" })]

    expect(rows(people).at(1)).toBe('"Alva ""Ally""; Ström";Deltagare;;;;;;;;;;;;;;')
  })

  it("names what each person signed up as, in the list's own word for it", () => {
    const people = [person({ role: "ledare" }), person({ role: "kontingentledning" })]

    expect(rows(people).map((row) => row.split(";", 2).at(1))).toEqual([
      "Typ av anmälan",
      "Ledare",
      "CMT",
    ])
  })

  it("ends every line the way the format says, so Excel reads the last row", () => {
    expect(contactSheet([person()], today)).toMatch(/\r\n$/u)
  })

  it("dates the file so a second export does not replace the first", () => {
    expect(contactSheetName(new Date(2026, 8, 20))).toBe("kontaktuppgifter-2026-09-20.csv")
  })
})
