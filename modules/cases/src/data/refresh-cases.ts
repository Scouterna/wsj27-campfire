import type { QueryClient } from "@tanstack/react-query"

import { fetchPeopleQuery } from "./fetch-people"

/**
 * Marks every cases query stale after a write and reads the ones on screen again – all
 * but the contingent's names, which no write to a case changes and which cost a request
 * per unit to read.
 * @param client The application's query client.
 * @returns Settles once the queries on screen have been read again, whether or not the
 * reads succeeded.
 */
export async function refreshCases(client: QueryClient): Promise<void> {
  const [, people] = fetchPeopleQuery().queryKey
  await client.invalidateQueries({
    predicate: (query) => query.queryKey[1] !== people,
    queryKey: ["cases"],
  })
}
