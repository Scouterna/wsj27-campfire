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

/**
 * The sheet split back into rows, without the mark that tells Excel its encoding.
 * @param people The people to write.
 * @returns The rows, heading first.
 */
function rows(people: readonly Participant[]): string[] {
  return contactSheet(people).replace("\u{FEFF}", "").trimEnd().split("\r\n")
}

describe("the contact sheet", () => {
  it("opens with the byte order mark Excel needs to read it as UTF-8", () => {
    // Without it the headings arrive as "NÃ¤rstÃ¥ende", which is the whole reason the
    // mark is here – nothing else in the file depends on it.
    expect(contactSheet([])).toMatch(/^\u{FEFF}/u)
  })

  it("heads the eight columns in the registration's own words", () => {
    expect(rows([])).toEqual([
      "Namn;Typ av anmälan;E-post;Alternativ e-post;Närstående 1 e-post;" +
        "Närstående 2 e-post;Nödkontakt 1 e-post;Nödkontakt 2 e-post",
    ])
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
      "Alva Ström;Deltagare;alva@example.se;alva@example.org;maria@example.se;;;frans@example.se",
    )
  })

  it("keeps a row for whoever has no address at all", () => {
    // A blank row is what says somebody is missing an address – leaving them out would
    // say they are not in the list.
    expect(rows([person()]).at(1)).toBe("Alva Ström;Deltagare;;;;;;")
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

    expect(rows(people).at(1)).toBe('"Alva ""Ally""; Ström";Deltagare;;;;;;')
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
    expect(contactSheet([person()])).toMatch(/\r\n$/u)
  })

  it("dates the file so a second export does not replace the first", () => {
    expect(contactSheetName(new Date(2026, 8, 20))).toBe("kontaktuppgifter-2026-09-20.csv")
  })
})
