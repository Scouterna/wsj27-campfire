import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import { caseUrl } from "./case-urls"
import { toIds } from "./dto/validation"

type AccessQueryKey = readonly ["cases", "access", string]

/**
 * Who can open one case, by member number – everyone its type's role and its level let in,
 * and those it is shared with who have some case type of their own, and so everyone it can
 * be assigned to. The service works it out from the whole list of participants, so it is
 * asked for only when someone is about to choose.
 * @param caseId The case whose access list to read.
 * @returns The query's options, selecting the member numbers in the service's order.
 */
export function fetchAccessQuery(
  caseId: string,
): UseQueryOptions<unknown, Error, readonly string[], AccessQueryKey> {
  return queryOptions({
    queryFn: async (): Promise<unknown> => fetch<unknown>(`${caseUrl(caseId)}/access`),
    queryKey: ["cases", "access", caseId] as const,
    select: toIds,
  })
}
