import { inReadingOrder, type Participant } from "./Participant"

/**
 * Whether pictures of a person may be published: the words that say it, shared by every
 * place that does so they never differ, and who in a unit said no.
 */

/**
 * What a person's answer says, as the profile shows it.
 * @param canPublish Whether pictures of them may be published.
 * @returns The answer in Swedish.
 */
export function picturesName(canPublish: boolean): "Får inte publiceras" | "Får publiceras" {
  return canPublish ? "Får publiceras" : "Får inte publiceras"
}

/**
 * What a screen reader says for the mark a person who said no carries.
 */
export const picturesWithheldLabel = "Bilder får inte publiceras"

/**
 * The people of one unit who said no to pictures of them being published, in reading
 * order. Only the people the list holds are counted, so an empty answer means nobody the
 * reader can see said no, never that nobody did.
 * @param people The list of participants as the reader may see it.
 * @param unitNumber The unit to look in.
 * @returns The ones who said no.
 */
export function withheldPictures(
  people: readonly Participant[],
  unitNumber: number,
): readonly Participant[] {
  return inReadingOrder(
    people.filter(
      (person) => person.unit?.number === unitNumber && person.picturesPublishable === false,
    ),
  )
}
