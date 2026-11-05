import { fetch, HttpError } from "@scouterna/wsj27-campfire-utils"
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
 * drops it, and the service's 404 – a unit that holds nobody, or one the caller may not
 * read – is an empty unit rather than a failure, as it is for the list.
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
      let rows: unknown
      try {
        rows = await fetch<unknown>(
          `/api/project/participants/troopinfo/${encodeURIComponent(String(unit))}?infolevel=full`,
        )
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return []
        }
        throw error
      }
      return Array.isArray(rows)
        ? rows
            .map((row: ParticipantDetailDto) => toParticipantDetail(row))
            .filter((detail) => detail !== undefined)
        : []
    },
    queryKey: ["participants", "unit-details", unit] as const,
  })
}
