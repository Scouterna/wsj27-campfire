/**
 * What somebody has done before that the jamboree resembles. Each fact carries its own
 * free text, so a description without the yes-or-no cannot exist.
 */
export interface Experience {
  /**
   * Whether they have taken part in international scouting, and what they said about it.
   */
  readonly internationalScouting?: { readonly has: boolean; readonly details?: string }
  /**
   * Whether they have traveled abroad on their own, and what they said about it.
   */
  readonly independentTravel?: { readonly has: boolean; readonly details?: string }
}
