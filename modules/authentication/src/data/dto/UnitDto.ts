import type { Unit } from "../../model/Unit"

/**
 * The one answer field the unit read uses from
 * `GET /api/project/participants/individual/<memberNo>`.
 */
export interface UnitDto {
  readonly troop?: unknown
}

/**
 * Reads the unit out of the register's answer. The wire carries the troop as a string,
 * and the ones that name a unit read as digits – a member type such as `IST` is a troop
 * to the register and no unit to Campfire, so it converts to nothing rather than to a
 * number that would be wrong.
 * @param dto The record the participants service answered with.
 * @returns The unit, or undefined when the record places them in none.
 */
export function toUnit(dto: UnitDto): Unit | undefined {
  const troop = dto.troop

  return typeof troop === "string" && /^\d+$/u.test(troop) ? { number: Number(troop) } : undefined
}
