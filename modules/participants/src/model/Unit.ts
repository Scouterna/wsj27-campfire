import { unitName } from "@scouterna/wsj27-campfire-ui"

/**
 * One of the contingent's units – the avdelning a deltagare or a ledare belongs to.
 */
export interface Unit {
  /**
   * What the unit is called – "Björnen". Absent for a number the contingent has not named.
   */
  readonly name?: string
  /**
   * The unit's number, which the participants service calls its troop.
   */
  readonly number: number
}

/**
 * The unit with a given number, named when the contingent names it.
 * @param number The unit's number.
 * @returns The unit.
 */
export function unitNumbered(number: number): Unit {
  const name = unitName(number)
  return name === undefined ? { number } : { name, number }
}
