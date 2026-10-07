import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { fetchCasesQuery } from "./fetch-cases"
import { fetchNotesQuery } from "./fetch-notes"
import { fetchPeopleQuery } from "./fetch-people"
import { refreshCases } from "./refresh-cases"

/**
 * A client holding an answer for every cases query, none of them stale.
 * @returns The client.
 */
function seededClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  client.setQueryData(fetchCasesQuery(true).queryKey, [])
  client.setQueryData(fetchCasesQuery(false).queryKey, [])
  client.setQueryData(fetchNotesQuery("7").queryKey, [])
  client.setQueryData(fetchPeopleQuery().queryKey, [])
  return client
}

/**
 * Whether the client holds a query under the key as stale.
 * @param client The client to ask.
 * @param queryKey The key to look up.
 * @returns True when the query is marked for a fresh read.
 */
function isInvalidated(client: QueryClient, queryKey: readonly unknown[]): boolean {
  return client.getQueryState(queryKey)?.isInvalidated ?? false
}

describe("refreshing after a write", () => {
  it("marks the lists and the notes stale, and leaves the contingent's names alone", async () => {
    const client = seededClient()

    await refreshCases(client)

    expect(isInvalidated(client, fetchCasesQuery(true).queryKey)).toBe(true)
    expect(isInvalidated(client, fetchCasesQuery(false).queryKey)).toBe(true)
    expect(isInvalidated(client, fetchNotesQuery("7").queryKey)).toBe(true)
    expect(isInvalidated(client, fetchPeopleQuery().queryKey)).toBe(false)
  })
})
