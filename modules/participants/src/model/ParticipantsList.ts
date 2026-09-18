import type { Participant } from "./Participant"

/**
 * What a returned list covers – the whole contingent, one unit, or nothing at all. The
 * viewer's roles decide it, exactly as the participants service's gates read them, and
 * the screen titles and counts itself by it.
 */
export type ListScope =
  | { readonly kind: "all" }
  | { readonly kind: "unit"; readonly unitNumber: number }
  | { readonly kind: "nobody" }

/**
 * The list of participants as the viewer may read it: the people they may see, and the
 * scope that says what those people are a list of.
 */
export interface ParticipantsList {
  /**
   * The people the viewer may see, in the order the listings arrived.
   */
  readonly people: readonly Participant[]
  /**
   * What the people are a list of.
   */
  readonly scope: ListScope
}
