import type { Travel, Unit } from "@scouterna/wsj27-campfire-utils"

import type { Registration } from "../../model/Registration"

/**
 * The fields the registration read uses from the participants service's record of one
 * person.
 */
export interface IndividualDto {
  readonly participation_type?: unknown
  readonly troop?: unknown
}

/**
 * The travel packages as the wire spells them, translated to the application's own
 * vocabulary here and nowhere else.
 */
const travelSpellings: ReadonlyMap<unknown, Travel> = new Map([
  ["Direktresa", "direktresa"],
  ["Egen resa", "egenResa"],
  ["Rundresa", "rundresa"],
])

/**
 * Reads the unit out of the participants service's answer. Only a troop of digits names
 * a unit, because a member type such as `IST` is a troop to the list of participants
 * and no unit to Campfire.
 * @param dto The record the participants service answered with.
 * @returns The unit, or undefined when the record places them in none.
 */
export function toUnit(dto: IndividualDto): Unit | undefined {
  const troop = dto.troop

  return typeof troop === "string" && /^\d+$/u.test(troop) ? { number: Number(troop) } : undefined
}

/**
 * Reads the travel package out of the same answer. Anything but the spellings the
 * service normalizes the registration to – the empty string the management's rows carry
 * included – converts to nothing rather than to a package nobody booked.
 * @param dto The record the participants service answered with.
 * @returns The travel package, or undefined when the record carries none.
 */
export function toTravel(dto: IndividualDto): Travel | undefined {
  return travelSpellings.get(dto.participation_type)
}

/**
 * The whole registration read: the unit and the travel package together, each missing
 * where the record holds nothing the application recognizes.
 * @param dto The record the participants service answered with.
 * @returns The registration – possibly with neither fact, which is still an answer.
 */
export function toRegistration(dto: IndividualDto): Registration {
  const travel = toTravel(dto)
  const unit = toUnit(dto)

  return {
    ...(travel !== undefined && { travel }),
    ...(unit !== undefined && { unit }),
  }
}
