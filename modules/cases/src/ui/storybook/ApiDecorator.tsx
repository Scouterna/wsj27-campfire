import { queryDecorator, type NetworkParameters } from "@scouterna/wsj27-campfire-ui"

import { fetchCasesQuery } from "../../data/fetch-cases"
import { fetchNotesQuery } from "../../data/fetch-notes"
import { fetchPeopleQuery } from "../../data/fetch-people"

/**
 * What a story says about the services behind it, under `parameters.api`. Every answer is
 * in the service's own wire shape, because that is what the cache holds.
 */
export interface ApiParameters extends NetworkParameters {
  /**
   * Every case, open and closed, newest first. The list without the closed ones is
   * derived from it.
   */
  readonly cases?: readonly Readonly<Record<string, unknown>>[]
  /**
   * The notes on each case, by the case's identifier.
   */
  readonly notes?: Readonly<Record<string, readonly unknown[]>>
  /**
   * The listing rows the contingent's names are read from.
   */
  readonly people?: readonly unknown[]
}

/**
 * Puts a cache seeded with the story's cases, notes, and names under a story, and the
 * project services in the state it asked for.
 */
export const ApiDecorator = queryDecorator<ApiParameters>({
  seed: (client, api) => {
    if (api.cases !== undefined) {
      client.setQueryData(fetchCasesQuery(true).queryKey, api.cases)
      client.setQueryData(
        fetchCasesQuery(false).queryKey,
        api.cases.filter((row) => row["closed"] !== true),
      )
    }
    if (api.people !== undefined) {
      client.setQueryData(fetchPeopleQuery().queryKey, api.people)
    }
    const notesByCase = Object.entries(api.notes ?? {})
    for (const [caseId, notes] of notesByCase) {
      client.setQueryData(fetchNotesQuery(caseId).queryKey, notes)
    }
  },
  service: "/api/project/",
})
