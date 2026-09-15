import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Unit } from "../model/Unit"
import { toUnit, type UnitDto } from "./dto/UnitDto"

/**
 * The key the unit read is cached under: the module, the thing, and who it is about, so
 * two people's units never share an entry.
 */
type UnitQueryKey = readonly ["authentication", "unit", string]

/**
 * The settled "no unit" answer. TanStack Query reserves `undefined` for "no data yet",
 * so an answer that means nothing must be its `null` – the one place this repository
 * trades in null on purpose.
 */
// eslint-disable-next-line unicorn/no-null -- TanStack Query forbids undefined as data
const noUnit = null

/**
 * Query options for the unit the register places somebody in.
 *
 * Every failure settles as no unit: a 403 (the caller may not see this much), a 404
 * (the register does not hold them), an unreachable service, and an answer that is not
 * JSON alike. The query function catches rather than rethrows, so the query settles
 * instead of retrying a refusal that will never become a yes – the application is
 * allowed not to know which unit somebody is in.
 * @param memberNo The Scoutnet member number to look up.
 * @returns The options to hand the query client.
 */
export function fetchUnitQuery(
  memberNo: string,
): UseQueryOptions<Unit | null, Error, Unit | null, UnitQueryKey> {
  return queryOptions({
    queryFn: async (): Promise<Unit | null> => {
      try {
        // Encoded because the number is read from a service payload: a value carrying
        // a reserved character must not rewrite the path or the query it is asked on.
        const unit = toUnit(
          await fetch<UnitDto>(
            `/api/project/participants/individual/${encodeURIComponent(memberNo)}`,
          ),
        )
        return unit ?? noUnit
      } catch {
        return noUnit
      }
    },
    queryKey: ["authentication", "unit", memberNo] as const,
  })
}
