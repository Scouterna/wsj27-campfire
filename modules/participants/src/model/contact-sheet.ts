import { ageOf, contactSlots, type ContactSlot, type Participant } from "./Participant"
import { roleName } from "./ParticipantRole"
import { formatPhoneNumber } from "./phone"

// The sheet the list hands to a spreadsheet: one row per person shown, saying who they
// are and every way to reach them the list holds. It is a CSV rather than a workbook
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
  /**
   * How a value is written for Excel – as a phone number, or by default as text.
   */
  readonly write?: (value: string) => string
}

// What each slot's person is called in a heading, in the registration's own words rather
// than the code's.
const nameBySlot: Readonly<Record<ContactSlot, string>> = {
  emergencyContact1: "Nödkontakt 1",
  emergencyContact2: "Nödkontakt 2",
  nextOfKin1: "Närstående 1",
  nextOfKin2: "Närstående 2",
}

/**
 * The whole sheet, left to right. The name and what they signed up as lead, so a row can
 * be recognized, then who they are, then how to reach them, with the contact columns in
 * the order the form asks for them in, each contact's number before their address as the
 * person's own are.
 * @param today The day the export is made, which the ages are counted to.
 * @returns The columns.
 */
function columns(today: Date): readonly SheetColumn[] {
  return [
    { heading: "Namn", read: (person) => `${person.firstName} ${person.lastName}`.trim() },
    // The same word the list puts in a row, rather than a second vocabulary for one fact.
    { heading: "Typ av anmälan", read: (person) => roleName(person.role) },
    {
      heading: "Ålder",
      read: (person) => {
        const age = ageOf(person, today)
        return age === undefined ? undefined : String(age)
      },
    },
    { heading: "Scoutkår", read: (person) => person.memberGroup },
    { heading: "Hemort", read: (person) => person.homeTown },
    // In the shape the person's own page shows it, so the sheet reads as the page does.
    { heading: "Mobiltelefon", read: (person) => person.phone, write: asPhone },
    { heading: "E-post", read: (person) => person.email },
    { heading: "Alternativ e-post", read: (person) => person.alternateEmail },
    ...contactSlots.flatMap((slot) => [
      {
        // eslint-disable-next-line security/detect-object-injection -- a slot is one of the model's own literals
        heading: `${nameBySlot[slot]} telefon`,
        // eslint-disable-next-line security/detect-object-injection -- as above
        read: (person: Participant) => person.contactPhones?.[slot],
        write: asPhone,
      },
      {
        // eslint-disable-next-line security/detect-object-injection -- as above
        heading: `${nameBySlot[slot]} e-post`,
        // eslint-disable-next-line security/detect-object-injection -- as above
        read: (person: Participant) => person.contactEmails?.[slot],
      },
    ]),
  ]
}

/**
 * Text as a cell Excel shows exactly as typed. Excel runs a value that starts like a
 * formula, and everything in the sheet was typed by whoever registered, so such a value
 * gets an apostrophe before it – the mark Excel reads as "this is text".
 * @param value The value to write.
 * @returns The cell's value.
 */
function asText(value: string): string {
  return /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value
}

/**
 * A phone number as a cell, in the shape the person's own page shows it, written as text
 * like every other cell.
 * @param phone The number, unformatted.
 * @returns The cell's value.
 */
function asPhone(phone: string): string {
  return asText(formatPhoneNumber(phone))
}

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
 * A list of people as a spreadsheet file: a heading row, then one row per person in the
 * list's order – everybody shown, including whoever has nothing in a column, because a
 * blank cell is what says somebody is missing it.
 *
 * The nödkontakt columns stand empty for a deltagare or an IST however complete their
 * registration is, because their form's template publishes no such questions.
 * @param people The people, as the list shows them.
 * @param today The day the export is made, which the ages are counted to – the same
 *   moment the file is named for.
 * @returns The file's whole contents, ready to be downloaded.
 */
export function contactSheet(people: readonly Participant[], today: Date): string {
  const sheet = columns(today)
  const rows = [
    sheet.map((column) => cell(column.heading)),
    ...people.map((person) =>
      sheet.map((column) => {
        const value = column.read(person)
        return cell(value === undefined ? undefined : (column.write ?? asText)(value))
      }),
    ),
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
