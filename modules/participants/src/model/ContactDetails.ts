/**
 * Somebody to reach about a participant – a närstående or a nödkontakt from their
 * registration. Only the name is guaranteed; the form lets everything else be left blank.
 */
export interface ContactPerson {
  /**
   * What they are called. A contact exists only when a name was given.
   */
  readonly name: string
  /**
   * How they are related to the participant.
   */
  readonly relation?: string
  /**
   * The number to call them on.
   */
  readonly phone?: string
  /**
   * The address to write to them at.
   */
  readonly email?: string
}

/**
 * An emergency contact from the leader form, ranked so the screen can put the first call
 * first. The secondary's phone is empty for everyone – broken in Scoutnet – so a ranked
 * contact without a phone is normal, not an error.
 */
export interface EmergencyContact extends ContactPerson {
  /**
   * Whether to try them first or second.
   */
  readonly rank: "primary" | "secondary"
}

/**
 * How to reach a participant and the people around them. The email and phone are empty
 * rather than absent where neither Scoutnet nor the registration holds one, and the
 * contact lists are empty when nobody was named, so a screen reads them without asking.
 */
export interface ContactDetails {
  /**
   * The address to write to them at.
   */
  readonly email: string
  /**
   * The number to call them on.
   */
  readonly phone: string
  /**
   * A second address they gave, where they gave one.
   */
  readonly alternateEmail?: string
  /**
   * The närstående they named, in the order the form asks for them.
   */
  readonly relatives: readonly ContactPerson[]
  /**
   * The contacts to try in an emergency, ranked.
   */
  readonly emergencyContacts: readonly EmergencyContact[]
}
