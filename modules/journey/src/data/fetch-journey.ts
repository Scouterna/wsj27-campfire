import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Plan } from "../model/Itinerary"
import { toPlan } from "./dto/JourneyDto"

/**
 * Query options for the contingent's whole plan. The cache holds the answer as it came over
 * the wire and `select` converts it on every read, because the cache is persisted as JSON and
 * the model's dates would come back from it as strings.
 *
 * The plan refetches every minute while a screen shows it, so a delay posted in Airtable
 * reaches the screen without the reader doing anything.
 * @returns Options for `useQuery`.
 */
export function fetchPlanQuery(): UseQueryOptions<
  unknown,
  Error,
  Plan,
  readonly ["journey", "plan"]
> {
  return queryOptions({
    queryFn: async (): Promise<unknown> => fetch<unknown>("/api/journey/plan"),
    queryKey: ["journey", "plan"] as const,
    refetchInterval: 60_000,
    select: toPlan,
  })
}
