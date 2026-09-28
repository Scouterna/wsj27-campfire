/**
 * The gender a person registered with in Scoutnet – how a leader addresses them, and what
 * patrols, tents, and sleeping places are planned around. `okant` is Scoutnet's own
 * answer for a member who gave none, and is shown as such rather than as a missing value.
 */
export type Gender = "annat" | "kvinna" | "man" | "okant"

/**
 * What a gender is called, in the registration's own words.
 * @param gender The gender to name.
 * @returns The Swedish word for it.
 */
export function genderName(gender: Gender): string {
  switch (gender) {
    case "annat": {
      return "Annat"
    }
    case "kvinna": {
      return "Kvinna"
    }
    case "man": {
      return "Man"
    }
    case "okant": {
      return "Okänt"
    }
  }
}
