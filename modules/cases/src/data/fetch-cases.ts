import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Case } from "../model/Case"
import { toCases } from "./dto/CaseDto"

/**
 * The key the list is cached under, one entry with the closed cases and one without.
 */
type CasesQueryKey = readonly ["cases", "list", boolean]

/**
 * Query options for the cases the health team keeps, newest first.
 *
 * The cache holds the payload as it arrived and `select` converts it on the way out,
 * because the cache is persisted as JSON, and a `Date` written that way comes back a
 * string.
 * @param isClosedIncluded Whether the closed cases are listed beside the open ones.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or the client's `query`.
 */
export function fetchCasesQuery(
  isClosedIncluded: boolean,
): UseQueryOptions<unknown, Error, readonly Case[], CasesQueryKey> {
  return queryOptions({
    queryFn: async (): Promise<unknown> =>
      fetch<unknown>(`/api/project/cases?include_closed=${String(isClosedIncluded)}`),
    queryKey: ["cases", "list", isClosedIncluded] as const,
    select: toCases,
  })
}
