/**
 * The shapes the seed is written in. What the services send is shaped beside the code that
 * sends it, under `auth/` and `project/`.
 */

/**
 * One of the seed's units, named by number alone. The units' real names and glyphs are
 * the web application's own data, and never the mock's.
 */
export interface Unit {
  /**
   * The heading the sign-in picker gives the unit's leaders.
   */
  readonly name: string
  /**
   * The unit's number, which is also the troop the list of participants and a leader's role carry.
   */
  readonly number: number
}

/**
 * Someone a developer can sign in as – an account at the ScoutID stand-in. Their roles are not
 * here, because they are minted from their row in the list of participants exactly as a real
 * account's are.
 */
export interface Persona {
  /**
   * What signing in as them demonstrates, in a sentence or two of Swedish – the line the picker
   * shows under the name.
   */
  readonly description: string
  /**
   * The account's email, and the picker's handle for the person.
   */
  readonly email: string
  readonly familyName: string
  readonly givenName: string
  /**
   * The Scoutnet member number ScoutID reports, which the auth service looks roles up by.
   */
  readonly memberNo: string
}

/**
 * One heading in the sign-in picker, and the personas under it.
 */
export interface PersonaGroup {
  readonly label: string
  readonly personas: readonly Persona[]
}

/**
 * One question in the project API's form template.
 */
export interface Question {
  /**
   * Scoutnet's own question id, the one a raw answer arrives under.
   */
  readonly id: string
  /**
   * The name the answer carries on the wire.
   */
  readonly key: string
  /**
   * The exact wording the question was asked with.
   */
  readonly label: string
}

/**
 * A section of a tab – "Annan nödkontakt", "Vaccinationer".
 */
export interface FormSection {
  readonly questions: readonly Question[]
  readonly title: string
}

/**
 * A tab of a form – "Grundläggande information", "Hälsoinformation".
 */
export interface FormTab {
  readonly sections: readonly FormSection[]
  readonly title: string
}

/**
 * One registration form in the template, and everything it publishes.
 */
export interface Form {
  readonly id: string
  readonly tabs: readonly FormTab[]
}

/**
 * What someone is at the jamboree. The form they filled in follows from it.
 */
export type ParticipantRole = "deltagare" | "ist" | "kontingentledning" | "ledare"

/**
 * The per-person grant Scoutnet's Accesstyp question records, by its option text.
 */
export type AccessLevel =
  "Avdelningsledare" | "Hälsa plus intern information" | "Ingen" | "Intern information"

/**
 * One answer – the option text or free text given, or every option picked where a question
 * takes several.
 */
export type Answer = string | readonly string[]

/**
 * A person in the list of participants, before the project API decodes them.
 */
export interface Participant {
  /**
   * Their Accesstyp. Absent is "Ingen", which is what the service reads an unset answer as.
   */
  readonly accessLevel?: AccessLevel
  /**
   * Their answers, keyed by question key. An unanswered question is absent, which is what the
   * list of participants really looks like.
   */
  readonly answers: Readonly<Record<string, Answer>>
  readonly birthDate: string
  /**
   * Their primary email in Scoutnet. Absent is null on the wire.
   */
  readonly email?: string
  readonly firstName: string
  /**
   * The id of the form they filled in.
   */
  readonly formId: string
  readonly id: string
  readonly lastName: string
  /**
   * The name of their scout group. Absent is an empty string on the wire.
   */
  readonly memberGroup?: string
  readonly memberNo: string
  /**
   * Their mobile number in Scoutnet. Absent is null on the wire.
   */
  readonly phone?: string
  readonly role: ParticipantRole
  /**
   * Scoutnet's label for their sex.
   */
  readonly sex: string
  /**
   * The unit they belong to. The contingent management belongs to none.
   */
  readonly unitNumber?: number
}
