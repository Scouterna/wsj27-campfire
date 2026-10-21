import { queryDecorator, type NetworkParameters } from "@scouterna/wsj27-campfire-ui"
import { RolesProvider, type Role } from "@scouterna/wsj27-campfire-utils"

import { fetchCaseTypesQuery } from "../../data/fetch-case-types"
import { fetchCasesQuery } from "../../data/fetch-cases"
import { fetchNotesQuery } from "../../data/fetch-notes"
import { fetchPeopleQuery } from "../../data/fetch-people"
import { reachOf } from "../use-people"

/**
 * The roles a story reads as when it names none: a member of the health team, who
 * reaches health cases and the management's, and every name in the contingent.
 */
const healthTeam: readonly Role[] = [{ kind: "cmt" }, { kind: "health" }]

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
   * The listing rows the names within the reader's reach are read from.
   */
  readonly people?: readonly unknown[]
  /**
   * Who is reading. A member of the health team when unsaid.
   */
  readonly roles?: readonly Role[]
  /**
   * The types the service says the reader may open cases of. Health and the
   * management's when unsaid.
   */
  readonly types?: readonly string[]
}

/**
 * Puts a cache seeded with the story's cases, notes, names, and types under a story, read
 * as the story's roles, and the project services in the state it asked for.
 */
export const ApiDecorator = queryDecorator<ApiParameters>({
  seed: (client, api) => {
    client.setQueryData(fetchCaseTypesQuery().queryKey, api.types ?? ["hälsa", "cmt"])
    if (api.cases !== undefined) {
      client.setQueryData(fetchCasesQuery(true).queryKey, api.cases)
      client.setQueryData(
        fetchCasesQuery(false).queryKey,
        api.cases.filter((row) => row["closed"] !== true),
      )
    }
    if (api.people !== undefined) {
      client.setQueryData(fetchPeopleQuery(reachOf(api.roles ?? healthTeam)).queryKey, api.people)
    }
    const notesByCase = Object.entries(api.notes ?? {})
    for (const [caseId, notes] of notesByCase) {
      client.setQueryData(fetchNotesQuery(caseId).queryKey, notes)
    }
  },
  service: "/api/project/",
  wrap: (story, api) => <RolesProvider roles={api.roles ?? healthTeam}>{story}</RolesProvider>,
})
