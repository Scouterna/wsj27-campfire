import type { ContactPerson } from "../../model/ContactDetails"
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
 * The address to write to somebody at: what they typed at registration, and where they
 * left it out, the live Scoutnet value in the basic block.
 * @param email The basic block's `email` field, as the service sent it.
 * @param answers The flattened answers.
 * @returns The address, or undefined when neither holds one.
 */
export function toPrimaryEmail(email: unknown, answers: Answers): string | undefined {
  // A registration answer of nothing but spaces is no answer, and must not stand in the
  // way of the address Scoutnet holds.
  const given = answer(answers, "email")?.trim()
  if (given !== undefined && given !== "") {
    return given
  }
  return typeof email === "string" && email.trim() !== "" ? email.trim() : undefined
}
