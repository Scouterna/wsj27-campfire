import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { ParticipantDetail } from "../model/ParticipantDetail"
import { toParticipantDetail, type ParticipantDetailDto } from "./dto/ParticipantDetailDto"
import type { Viewer } from "./viewer"

/**
 * The key a unit's full records are cached under – beside the list, since it is the same
 * people read at a deeper level.
 */
type UnitDetailsQueryKey = readonly ["participants", "unit-details", number]

/**
 * Every person of a leader's own unit in full – their health, diet, and notes included,
 * which the list leaves out. A plain list rather than a lookup, because the cache is
 * persisted as JSON, and a map would come back from it as an empty object.
 *
 * One listing rather than one read per person, because a leader may read their own unit
 * in full and a unit is forty people. A leader's fellow leaders come back without their
 * answers, which the service keeps from everyone but the management's health team, so
 * a leader's record says nothing here. A row that does not convert is dropped, as a list
 * drops it.
 * @param viewer Who is reading. Asks nothing for a viewer who leads no unit.
 * @returns Options for `useQuery`.
 */
export function fetchUnitDetailsQuery(
  viewer: Viewer,
): UseQueryOptions<
  readonly ParticipantDetail[],
  Error,
  readonly ParticipantDetail[],
  UnitDetailsQueryKey
> {
  const unit = viewer.unitNumber ?? 0
  return queryOptions({
    enabled: viewer.memberNo !== "" && viewer.unitNumber !== undefined,
    queryFn: async (): Promise<readonly ParticipantDetail[]> => {
      const rows = await fetch<unknown>(
        `/api/project/participants/troopinfo/${encodeURIComponent(String(unit))}?infolevel=full`,
      )
      return Array.isArray(rows)
        ? rows
            .map((row: ParticipantDetailDto) => toParticipantDetail(row))
            .filter((detail) => detail !== undefined)
        : []
    },
    queryKey: ["participants", "unit-details", unit] as const,
  })
}
