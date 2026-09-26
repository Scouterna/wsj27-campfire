import { contactSlots, type ContactSlot, type Participant } from "./Participant"
import { roleName } from "./ParticipantRole"

// The sheet the list hands to a spreadsheet: one row per person shown, naming them and
// every address the registration holds for them. It is a CSV rather than a workbook
// because columns of plain text need nothing a workbook has, and writing one would mean
// a dependency shipped into every phone that caches the application.

// What Excel needs to read the file, none of it its default. The byte order mark makes it
// open the file as UTF-8 rather than in the system's code page, without which
// "Närstående" arrives mangled, and the semicolon is the separator it expects wherever
// the decimal mark is a comma, Sweden included. The line ending is the one the format
// specifies.
const byteOrderMark = "\u{FEFF}"
const lineEnding = "\r\n"
const separator = ";"

/**
 * One column of the sheet: what it is called, and what it reads from a person.
 */
interface SheetColumn {
  /**
   * The heading in the first row, in the words the registration uses.
   */
  readonly heading: string
  /**
   * The cell's value for one person, or undefined where they have none.
   */
  readonly read: (person: Participant) => string | undefined
}

// The heading each slot gets, in the registration's own words rather than the code's.
const headingBySlot: Readonly<Record<ContactSlot, string>> = {
  emergencyContact1: "Nödkontakt 1 e-post",
  emergencyContact2: "Nödkontakt 2 e-post",
  nextOfKin1: "Närstående 1 e-post",
  nextOfKin2: "Närstående 2 e-post",
}

// The whole sheet, left to right. The name and what they signed up as lead, so a row can
// be recognized, and the contact columns follow the order the form asks for them in.
const columns: readonly SheetColumn[] = [
  { heading: "Namn", read: (person) => `${person.firstName} ${person.lastName}`.trim() },
  // The same word the list puts in a row, rather than a second vocabulary for one fact.
  { heading: "Typ av anmälan", read: (person) => roleName(person.role) },
  { heading: "E-post", read: (person) => person.email },
  { heading: "Alternativ e-post", read: (person) => person.alternateEmail },
  ...contactSlots.map((slot) => ({
    // eslint-disable-next-line security/detect-object-injection -- a slot is one of the model's own literals
    heading: headingBySlot[slot],
    // eslint-disable-next-line security/detect-object-injection -- as above
    read: (person: Participant) => person.contactEmails?.[slot],
  })),
]

/**
 * One cell, quoted where it has to be. A value holding the separator, a quote, or a line
 * break would otherwise end the cell early and shift every column after it.
 * @param value The cell's value, or undefined where the person has none.
 * @returns The cell as the file carries it.
 */
function cell(value = ""): string {
  if (!/["\n\r;]/u.test(value)) {
    return value
  }
  return `"${value.replaceAll('"', '""')}"`
}

/**
 * The addresses of a list of people as a spreadsheet file: a heading row, then one row
 * per person in the list's order – everybody shown, including whoever has no address at
 * all, because a blank cell is what says somebody is missing one.
 *
 * The nödkontakt columns stand empty for a deltagare or an IST however complete their
 * registration is, because their form's template publishes no such questions.
 * @param people The people, as the list shows them.
 * @returns The file's whole contents, ready to be downloaded.
 */
export function contactSheet(people: readonly Participant[]): string {
  const rows = [
    columns.map((column) => cell(column.heading)),
    ...people.map((person) => columns.map((column) => cell(column.read(person)))),
  ]
  return byteOrderMark + rows.map((row) => row.join(separator)).join(lineEnding) + lineEnding
}

/**
 * What the downloaded file is called – dated, so a second export does not silently
 * replace the first in the downloads folder.
 * @param today The day the export was made.
 * @returns The file name, dated in the Swedish way, which is the ISO one.
 */
export function contactSheetName(today: Date): string {
  return `kontaktuppgifter-${today.toLocaleDateString("sv-SE")}.csv`
}
