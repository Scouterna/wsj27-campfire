/**
 * Something somebody wrote in a catch-all question, addressed to whoever the question
 * named – the form has one for the unit leader and one for the contingent management.
 */
export interface Note {
  /**
   * Who the question said would read it.
   */
  readonly audience: "avdelningsledaren" | "kontingentledningen"
  /**
   * What they wrote.
   */
  readonly text: string
}

/**
 * What a note's audience is called in Swedish, as the callout titles it.
 * @param audience The audience to name.
 * @returns The Swedish title.
 */
export function audienceName(audience: Note["audience"]): string {
  switch (audience) {
    case "avdelningsledaren": {
      return "Till avdelningsledaren"
    }
    case "kontingentledningen": {
      return "Till kontingentledningen"
    }
  }
}
