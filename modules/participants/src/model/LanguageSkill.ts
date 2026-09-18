/**
 * The languages the leader form grades, beyond Swedish.
 */
export type Language = "english" | "french" | "spanish" | "arabic" | "polish"

/**
 * What a language is called in Swedish.
 * @param language The language to name.
 * @returns The Swedish label.
 */
export function languageName(language: Language): string {
  switch (language) {
    case "english": {
      return "Engelska"
    }
    case "french": {
      return "Franska"
    }
    case "spanish": {
      return "Spanska"
    }
    case "arabic": {
      return "Arabiska"
    }
    case "polish": {
      return "Polska"
    }
  }
}

/**
 * How well a language is spoken, on the form's 0–5 scale.
 */
export type Proficiency = 0 | 1 | 2 | 3 | 4 | 5

/**
 * One language and how well this person speaks it.
 */
export interface LanguageSkill {
  /**
   * The language being graded.
   */
  readonly language: Language
  /**
   * How well they speak it.
   */
  readonly level: Proficiency
}
