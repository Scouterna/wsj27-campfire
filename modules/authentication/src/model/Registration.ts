import type { Travel, Unit } from "@scouterna/wsj27-campfire-utils"

/**
 * What the list of participants says about the signed-in person: the unit it places
 * them in, and how they travel. Either fact can be missing – the contingent management
 * has no unit, and a record outside the caller's scope answers nothing at all.
 */
export interface Registration {
  /**
   * The travel package the registration carries, where the record holds one the
   * application knows.
   */
  readonly travel?: Travel
  /**
   * The unit the list of participants places them in, where it places them in one.
   */
  readonly unit?: Unit
}
