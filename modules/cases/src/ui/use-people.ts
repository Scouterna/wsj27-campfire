import { hasAnyRole, useRoles, type Role } from "@scouterna/wsj27-campfire-utils"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { fetchPeopleQuery, type PeopleReach } from "../data/fetch-people"
import type { People } from "../model/Person"

/**
 * The units a set of roles leads, each once and in order.
 * @param roles The roles to read the units from.
 * @returns The unit numbers – none for somebody who leads no numbered unit.
 */
export function leaderUnits(roles: readonly Role[]): readonly number[] {
  const units = roles.flatMap((role) =>
    role.kind === "leader" && role.unitNumber !== undefined ? [role.unitNumber] : [],
  )
  return [...new Set(units)].toSorted((left, right) => left - right)
}

/**
 * Whose names a set of roles may be shown – everyone for the contingent management, and
 * a leader's own units for a leader.
 * @param roles The roles that decide the reach.
 * @returns The reach, as the people query takes it.
 */
export function reachOf(roles: readonly Role[]): PeopleReach {
  return hasAnyRole(roles, "cmt")
    ? { kind: "contingent" }
    : { kind: "units", unitNumbers: leaderUnits(roles) }
}

/**
 * The one unit a set of roles leads, whose number the screens leave out because it tells
 * the reader nothing – undefined for a leader of several, who needs the numbers to tell
 * their units apart, and for the management, who reads every unit.
 * @param roles The roles held.
 * @returns The unit's number, or undefined.
 */
export function ownUnitOf(roles: readonly Role[]): number | undefined {
  const reach = reachOf(roles)
  return reach.kind === "units" && reach.unitNumbers.length === 1 ? reach.unitNumbers[0] : undefined
}

/**
 * The one unit the signed-in person leads, as `ownUnitOf` reads it from their roles.
 * @returns The unit's number, or undefined.
 */
export function useOwnUnit(): number | undefined {
  return ownUnitOf(useRoles())
}

/**
 * The names within the signed-in person's reach, by member number – who a case is about,
 * who wrote what, and who a new case can be about.
 * @returns The query, as TanStack Query reports it.
 */
export function usePeople(): UseQueryResult<People> {
  const reach = reachOf(useRoles())
  return useQuery(fetchPeopleQuery(reach))
}
