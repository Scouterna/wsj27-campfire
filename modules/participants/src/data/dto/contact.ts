import type { ContactPerson } from "../../model/ContactDetails"
import { contactSlots, type ContactEmails, type ContactSlot } from "../../model/Participant"
import { answer, type Answers } from "./answers"

// The contact reads the listing and the detail share. One definition of what a person's
// email is and who counts as a närstående, so a row in the list and the person opened
// from it can never disagree about either.

/**
 * A contact exists when their name was given – the other fields follow it.
 * @param answers The flattened answers.
 * @param prefix The question keys' shared prefix, such as `nextOfKin1`.
 * @returns The contact, or undefined when no name was given.
 */
export function toContactPerson(answers: Answers, prefix: string): ContactPerson | undefined {
  const name = answer(answers, `${prefix}Name`)
  if (name === undefined) {
    return undefined
  }
  const relation = answer(answers, `${prefix}Relation`)
  const phone = answer(answers, `${prefix}Phone`)
  const email = answer(answers, `${prefix}Email`)
  return {
    name,
    ...(relation !== undefined && { relation }),
    ...(phone !== undefined && { phone }),
    ...(email !== undefined && { email }),
  }
}

/**
 * The addresses of everybody the registration names around a person – the två närstående
 * and the two nödkontakter – kept under the slot each was named in, so a list can write
 * to all of them at once and a sheet can give each its own column.
 *
 * Whether somebody wanted their contacts written to is a question the registration asks
 * and the participants service does not publish, so every named address is gathered. A
 * form that asks for no nödkontakt simply has no answers under those keys.
 * @param answers The flattened answers.
 * @returns The addresses by slot – empty when nobody gave one.
 */
export function toContactEmails(answers: Answers): ContactEmails {
  return Object.fromEntries(
    contactSlots
      .map((slot) => [slot, toContactPerson(answers, slot)?.email] as const)
      .filter((entry): entry is readonly [ContactSlot, string] => entry[1] !== undefined),
  )
}

/**
 * The närstående a person named, in the order the form asks for them.
 * @param answers The flattened answers.
 * @returns The named ones – empty when nobody was, or when the viewer may not read them.
 */
export function toRelatives(answers: Answers): readonly ContactPerson[] {
  return [toContactPerson(answers, "nextOfKin1"), toContactPerson(answers, "nextOfKin2")].filter(
    (person): person is ContactPerson => person !== undefined,
  )
}

/**
 * The current value of something Scoutnet holds and the registration copied down: the
 * basic block's own field, and where that holds nothing, the copy in the answers.
 *
 * The copy is what Scoutnet held on the day the application was made – the form's
 * "Information redan i Scoutnet" section shows it to be confirmed rather than written, so
 * it can only be as current as the registry was then, never more. A young member whose
 * record carried a parent's address when they applied carries it here still.
 * @param live The basic block's own field, as the service sent it.
 * @param answers The flattened answers.
 * @param key The question key the registration copied the field into.
 * @returns The value, or undefined when neither source holds one.
 */
export function toCurrent(live: unknown, answers: Answers, key: string): string | undefined {
  const current = typeof live === "string" ? live.trim() : ""
  if (current !== "") {
    return current
  }
  // A copy of nothing but spaces is no copy, and stands in for nothing.
  const copied = answer(answers, key)?.trim()
  return copied === undefined || copied === "" ? undefined : copied
}
