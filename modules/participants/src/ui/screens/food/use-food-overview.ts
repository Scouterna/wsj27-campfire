import { HttpError } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchUnitDetailsQuery } from "../../../data/fetch-unit-details"
import { canReadUnitHealth, useViewer } from "../../../data/viewer"
import { foodOverview, type FoodOverview } from "../../../model/food-overview"
import { unitNumberOf } from "../../../model/groups"

/**
 * What the overview can show for one unit, by what became of reading it.
 */
export type FoodOverviewView =
  | {
      /**
       * The read failed with nothing stored.
       */
      readonly kind: "failed"
      /**
       * Asks again.
       */
      readonly refetch: () => void
    }
  | {
      /**
       * The read is on its way with nothing stored.
       */
      readonly kind: "pending"
    }
  | {
      /**
       * The unit's answers are here, freshly read or stored.
       */
      readonly kind: "ready"
      /**
       * The unit's food needs.
       */
      readonly overview: FoodOverview
      /**
       * The unit the overview is of.
       */
      readonly unitNumber: number
    }
  | {
      /**
       * The unit's answers are not the reader's to read, or the address names no unit.
       */
      readonly kind: "refused"
    }

/**
 * Whether the service refused the read rather than failed to answer it. A 404 is a
 * refusal too, because the service answers a unit outside the reader's scope as one that
 * does not exist.
 * @param error What the read failed with.
 * @returns True for a 403 or a 404.
 */
function isRefusal(error: Error | null): boolean {
  return error instanceof HttpError && (error.status === 403 || error.status === 404)
}

/**
 * One unit's food needs, read from its records in full. A unit the reader may not read is
 * refused without asking, so a reader without the right sees no fetching first.
 * @param unit The unit the address names, as written.
 * @returns What the overview can show.
 */
export function useFoodOverview(unit: string): FoodOverviewView {
  const viewer = useViewer()
  const number = unitNumberOf(unit)
  const isAllowed = number !== undefined && canReadUnitHealth(viewer, number)
  const { data, error, refetch } = useQuery(fetchUnitDetailsQuery(viewer, number))
  const overview = useMemo(() => (data === undefined ? undefined : foodOverview(data)), [data])

  if (!isAllowed) {
    return { kind: "refused" }
  }
  // A refusal outranks a stored answer, because it is the service's answer, where a lost
  // connection only keeps the stored one from being refreshed.
  if (isRefusal(error)) {
    return { kind: "refused" }
  }
  if (overview !== undefined) {
    return { kind: "ready", overview, unitNumber: number }
  }
  if (error !== null) {
    return {
      kind: "failed",
      refetch: () => {
        void refetch()
      },
    }
  }
  return { kind: "pending" }
}
