import type { Role } from "../roles/roles"

/**
 * How the signed-in person travels to the jamboree. A closed set, like the roles – the
 * registration offers exactly these three, and the contingent management travels
 * outside them. Where the list of participants gave no answer there is no `Travel` at
 * all, and nothing downstream may treat that as a booked seat.
 */
export type Travel = "direktresa" | "egenResa" | "rundresa"

/**
 * A unit in the contingent, as the application knows one so far: its number. Where
 * somebody has no unit, there is no `Unit` at all – never an empty one.
 */
export interface Unit {
  /**
   * The unit's number, as the list of participants keys it.
   */
  readonly number: number
}

/**
 * The signed-in person, as the application knows them – our definition, not the
 * provider's: the decode reads whatever ScoutID spells and answers with these facts,
 * derivations included, so nothing downstream ever meets a provider field or works out
 * for itself how the person reads. There is no second definition of who is signed in.
 */
export interface User {
  /**
   * What to greet them by – derived once, at the decode, from whatever name parts the
   * provider sent.
   */
  readonly firstName: string
  /**
   * The mark they wear wherever the application shows them as a badge: their unit's –
   * a leader's with the star – or the management's. Nobody else wears one.
   */
  readonly mark?: UserMark
  /**
   * The Scoutnet member number – what the list of participants and the roles are keyed by.
   */
  readonly memberNo: string
  /**
   * The full name, for wherever a greeting is too little.
   */
  readonly name: string
  /**
   * The line that says what they are in the contingent – "Ledare", "CMT · Program",
   * "Deltagare" – in the application's own words. The leader reading wins when the
   * roles carry both.
   */
  readonly roleLine: string
  /**
   * The same line with a leader's unit on it – "Ledare · Avdelning 1" – for wherever
   * the unit may be shown. Identical to `roleLine` for everybody else.
   */
  readonly roleLineWithUnit: string
  /**
   * The roles the application knows, translated once from the provider's flattened
   * spellings.
   */
  readonly roles: readonly Role[]
  /**
   * How they travel to the jamboree, where the list of participants says – the fact the
   * journey's countdown reads, and plenty of people are simply not placed on a package.
   */
  readonly travel?: Travel
  /**
   * The unit the roles or the list of participants place them in, where either does –
   * a leader's comes from their role, anyone else's from the list, and plenty of people
   * simply have none.
   */
  readonly unit?: Unit
}

/**
 * The mark a signed-in person wears.
 */
export interface UserMark {
  /**
   * Whether the mark carries the leader's star.
   */
  readonly isLeader: boolean
  /**
   * The unit whose mark it is. Absent for the contingent management, whose mark is
   * its own.
   */
  readonly unitNumber?: number
}
