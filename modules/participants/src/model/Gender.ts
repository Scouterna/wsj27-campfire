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

/**
 * How many people of a gender there are, in words a sentence can carry – "2 kvinnor",
 * "1 man", "3 med annat kön".
 * @param gender The gender counted.
 * @param count How many have it.
 * @returns The count and its noun, inflected for the count.
 */
export function genderCount(gender: Gender, count: number): string {
  const isOne = count === 1
  switch (gender) {
    case "annat": {
      return `${String(count)} med annat kön`
    }
    case "kvinna": {
      return `${String(count)} ${isOne ? "kvinna" : "kvinnor"}`
    }
    case "man": {
      return `${String(count)} ${isOne ? "man" : "män"}`
    }
    case "okant": {
      return `${String(count)} med okänt kön`
    }
  }
}
