import { type ParticipantRole } from "./ParticipantRole"
import type { CmtFunktion } from "./Participation"

/**
 * The slots the registration names people in, in the order it asks for them – the
 * närstående on every form, and the nödkontakter on the leaders' own. The names are the
 * question keys' prefixes, so one list drives the reading and the columns alike.
 */
export const contactSlots = [
  "nextOfKin1",
  "nextOfKin2",
  "emergencyContact1",
  "emergencyContact2",
] as const

/**
 * A slot a person names somebody in.
 */
export type ContactSlot = (typeof contactSlots)[number]

/**
 * One way of reaching the people a person named, for each slot – an address, or a phone
 * number. A slot nobody was named in, or one whose person gave none, is absent.
 */
export type ContactValues = Partial<Readonly<Record<ContactSlot, string>>>

/**
 * A person as the list of participants shows them – what a row needs, and the addresses
 * and numbers the list mails, copies, and exports. Everything else they answered when they
 * signed up belongs to `ParticipantDetail` and is fetched only when somebody is opened.
 */
export interface Participant {
  /**
   * The member number – the identity. The participants service has no other stable key,
   * so it is what routes, caches, and links carry.
   */
  readonly memberNo: string
  /**
   * Everything before the family name, so a person with two given names keeps both.
   */
  readonly firstName: string
  /**
   * The family name.
   */
  readonly lastName: string
  /**
   * What they are at the jamboree.
   */
  readonly role: ParticipantRole
  /**
   * The unit a deltagare or a ledare belongs to. Absent for the IST, whose patrols the
   * participants service does not carry, and for the contingent management, which
   * belongs to no unit.
   */
  readonly unitNumber?: number
  /**
   * The birth date as the service sent it, an ISO date. Absent when the service left
   * it out.
   */
  readonly birthDate?: string
  /**
   * The scoutkår the person belongs to at home. Absent when Scoutnet holds none.
   */
  readonly memberGroup?: string
  /**
   * The postort they live at, as the participants service sends it – trimmed, in the
   * case it was typed, with the country after it when abroad. Absent when it has none.
   */
  readonly homeTown?: string
  /**
   * The address to write to them at – the one the detail shows as theirs. Absent when
   * neither the registration nor Scoutnet holds one.
   */
  readonly email?: string
  /**
   * A second address of their own, where they gave one. The registration promises it the
   * same jamboree information as the primary, so both are written to – and for a young
   * member whose Scoutnet record holds a parent's address, this is the one that is theirs.
   */
  readonly alternateEmail?: string
  /**
   * The addresses of the people they named around them, by the slot each was named in.
   * Absent when none gave one, and when the viewer may not read them.
   */
  readonly contactEmails?: ContactValues
  /**
   * The phone numbers of the people they named around them, unformatted, by the slot each
   * was named in. Absent as the addresses are. Read by the export alone.
   */
  readonly contactPhones?: ContactValues
  /**
   * The current mobile number, unformatted – Scoutnet's, else the registration's copy.
   * Read by the export alone; the person's page reads its own record's.
   */
  readonly phone?: string
  /**
   * The function a management member serves in, read out of the record's minted roles.
   * Absent for everyone else, and for a management member the roster has not detailed.
   */
  readonly funktion?: CmtFunktion
  /**
   * Marks the funktionsansvarig – the member responsible for their funktion, the "FA"
   * roll on the contingent's roster. Absent rather than false for everyone else.
   */
  readonly isFunktionsansvarig?: true
}

// The numbers past the last unit, which the IST and the contingent management wear, each
// with a mark and a name of their own.
const istAvatarNumber = 54
const cmtAvatarNumber = 55

/**
 * The number whose mark a person wears – their unit's, the IST's, or the management's.
 * Undefined for the rare deltagare or ledare the service left without a unit, who have no
 * mark to wear, so a caller falls back to initials.
 * @param person The person whose mark to pick.
 * @returns The number, or undefined when they have no mark.
 */
export function avatarNumberFor(person: Participant): number | undefined {
  if (person.unitNumber !== undefined) {
    return person.unitNumber
  }
  if (person.role === "ist") {
    return istAvatarNumber
  }
  if (person.role === "kontingentledning") {
    return cmtAvatarNumber
  }
  return undefined
}

/**
 * How old a person is on a given day, in whole years. Undefined when the birth date is
 * absent, is not a date, or is still to come – an absent age is shown as nothing, never
 * as a guess.
 * @param person The person whose age to compute.
 * @param today The moment to count to, read as the calendar day it is where the reader
 *   is – the day an export is also named for.
 * @returns The age in whole years, or undefined.
 */
export function ageOf(person: Participant, today: Date): number | undefined {
  if (person.birthDate === undefined || !/^\d{4}-\d{2}-\d{2}$/u.test(person.birthDate)) {
    return undefined
  }
  // Parsed as UTC only to be checked and read back as a plain calendar date, which it is.
  // A day past its month's end parses too – the 30th of February lands in March – so the
  // date is held to reading back as it was written.
  const born = new Date(`${person.birthDate}T00:00:00Z`)
  if (Number.isNaN(born.getTime()) || born.toISOString().slice(0, 10) !== person.birthDate) {
    return undefined
  }
  let age = today.getFullYear() - born.getUTCFullYear()
  const isBeforeBirthday =
    today.getMonth() < born.getUTCMonth() ||
    (today.getMonth() === born.getUTCMonth() && today.getDate() < born.getUTCDate())
  if (isBeforeBirthday) {
    age -= 1
  }
  return age >= 0 ? age : undefined
}

/**
 * Where a person comes from – their scoutkår and home town, in that order, joined by
 * " · ". Undefined when neither is known.
 * @param person The person to place.
 * @returns The line, or undefined when there is nothing to say.
 */
export function whereFrom(person: Participant): string | undefined {
  const parts = [person.memberGroup, person.homeTown].filter((part) => part !== undefined)
  return parts.length === 0 ? undefined : parts.join(" · ")
}

// Constructed once, because a collator is expensive to build and free to reuse, and a
// sort of the whole contingent would otherwise build one per comparison.
const swedish = new Intl.Collator("sv")

/**
 * Somebody's full name, as every list row and heading shows it.
 * @param person The person to name.
 * @returns The given names and the family name, joined.
 */
export function fullName(person: Participant): string {
  return `${person.firstName} ${person.lastName}`
}

/**
 * Where a person sits in the contingent, for the line under their name: their unit, the
 * IST, or the contingent when they belong to neither. A unit is given by its number,
 * because its name is runtime data the screen adds beside it.
 * @param person The person to place.
 * @returns The one line that says where they belong.
 */
export function belonging(person: Participant): string {
  switch (person.role) {
    case "ist": {
      return "IST"
    }
    case "kontingentledning": {
      return "Kontingenten"
    }
    case "deltagare":
    case "ledare": {
      // A deltagare or a ledare the service placed in no unit is rare and not an error to
      // surface here, because the contingent is the honest answer for anybody the units
      // do not hold.
      return person.unitNumber === undefined
        ? "Kontingenten"
        : `Avdelning ${String(person.unitNumber)}`
    }
  }
}

/**
 * A list in reading order, by the whole name as the service sends it, given name first,
 * because the service sends no family name to sort by and a guessed split misfiles more
 * names than it helps find. Names collate in Swedish, where å, ä, and ö sort after z.
 * @param people The people to order. Left untouched.
 * @returns A new list, in reading order.
 */
export function inReadingOrder(people: readonly Participant[]): readonly Participant[] {
  return people.toSorted((left, right) => swedish.compare(fullName(left), fullName(right)))
}
