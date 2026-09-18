import { type ParticipantRole } from "./ParticipantRole"
import type { CmtFunktion } from "./Participation"

/**
 * A person as the list of participants shows them – what a row needs, and the addresses
 * the list mails and copies. Every other way to reach them, and everything they answered
 * when they signed up, belongs to `ParticipantDetail` and is fetched only when somebody
 * is opened.
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
   * The scoutkår the person belongs to at home. Absent when the registry holds none.
   */
  readonly memberGroup?: string
  /**
   * The address to write to them at – the one the detail shows as theirs. Absent when
   * neither the registration nor Scoutnet holds one.
   */
  readonly email?: string
  /**
   * The addresses of the närstående they named, in the order the form asks for them.
   * Absent when none gave one, and when the viewer may not read them.
   */
  readonly relativeEmails?: readonly string[]
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

/**
 * The register slots beyond the units: the IST wear 54 and the contingent management
 * 55, each with a mark and a name of their own.
 */
const istAvatarNumber = 54
const cmtAvatarNumber = 55

/**
 * The number whose mark a person wears: their unit's, the IST's 54, or the
 * management's 55. Undefined for the rare deltagare or ledare the service left
 * without a unit – they have no mark to wear, and a caller falls back to initials.
 * @param person The person whose mark to pick.
 * @returns The register number, or undefined.
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
 * absent or is not a date – an absent age is shown as nothing, never as a guess.
 * @param person The person whose age to compute.
 * @param today The day to count to.
 * @returns The age in whole years, or undefined.
 */
export function ageOf(person: Participant, today: Date): number | undefined {
  if (person.birthDate === undefined || !/^\d{4}-\d{2}-\d{2}$/u.test(person.birthDate)) {
    return undefined
  }
  const born = new Date(`${person.birthDate}T00:00:00Z`)
  if (Number.isNaN(born.getTime())) {
    return undefined
  }
  let age = today.getUTCFullYear() - born.getUTCFullYear()
  const isBeforeBirthday =
    today.getUTCMonth() < born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate())
  if (isBeforeBirthday) {
    age -= 1
  }
  return age >= 0 ? age : undefined
}

// Constructed once: a collator is expensive to build and free to reuse, and a sort of
// 2,600 people would otherwise build one per comparison.
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
 * IST, or the contingent when they belong to neither. Units are numbered and never
 * named – their identities are the contingent's own secret until the reveal.
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
      // A deltagare or a ledare the service placed in no unit is rare and is not an
      // error to surface here: the contingent is the honest answer for anybody the
      // units do not hold.
      return person.unitNumber === undefined
        ? "Kontingenten"
        : `Avdelning ${String(person.unitNumber)}`
    }
  }
}

/**
 * A list in reading order: by name, as a person is looked up. The name as the list of
 * participants sends it – one string opening with the given name – because the service
 * sends no family name to sort by, and a guessed split misfiles more names than it
 * helps find.
 *
 * Sorting is the client's job because the answer depends on how the list is being read,
 * and asking the service to re-sort is a round trip for something that costs nothing
 * here. Names collate in Swedish, where å, ä, and ö sort after z.
 * @param people The people to order. Left untouched.
 * @returns A new list, in reading order.
 */
export function inReadingOrder(people: readonly Participant[]): readonly Participant[] {
  return people.toSorted((left, right) => swedish.compare(fullName(left), fullName(right)))
}
