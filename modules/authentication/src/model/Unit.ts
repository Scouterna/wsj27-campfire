/**
 * A unit in the contingent, as the application knows one so far: its number. Where
 * somebody has no unit, there is no `Unit` at all – never an empty one.
 */
export interface Unit {
  /**
   * The unit's number, as the register keys it.
   */
  readonly number: number
}
