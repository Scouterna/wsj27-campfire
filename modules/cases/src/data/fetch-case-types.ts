import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { CaseType } from "../model/CaseType"
import { toCaseTypes } from "./dto/CaseTypesDto"

/**
 * The key the caller's types are cached under.
 */
type CaseTypesQueryKey = readonly ["cases", "types"]

/**
 * Query options for the types the signed-in person may open cases of – the service's own
 * answer, because it depends on their roles. A caller with none is refused with a 403,
 * which the query throws as an `HttpError`.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or the client's `query`.
 */
export function fetchCaseTypesQuery(): UseQueryOptions<
  unknown,
  Error,
  readonly CaseType[],
  CaseTypesQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<unknown> => fetch<unknown>("/api/project/cases/types"),
    queryKey: ["cases", "types"] as const,
    select: toCaseTypes,
  })
}
