import { hasAnyRole, useRoles, type Role } from "@scouterna/wsj27-campfire-utils"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { fetchPeopleQuery, type PeopleReach } from "../data/fetch-people"
import type { People } from "../model/Person"

/**
 * The units a set of roles leads, each once and in order.
 * @param roles The roles held.
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
 * @param roles The roles held.
 * @returns The reach.
 */
export function reachOf(roles: readonly Role[]): PeopleReach {
  return hasAnyRole(roles, "cmt")
    ? { kind: "contingent" }
    : { kind: "units", unitNumbers: leaderUnits(roles) }
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
