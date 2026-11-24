/**
 * The words that say whether pictures of a person may be published, shared by the
 * profile's fact, the mark on a row, and the patrol chip's name, so the three never differ.
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
