import { queryDecorator, type NetworkParameters } from "@scouterna/wsj27-campfire-ui"
import { RolesProvider, UserProvider, type Role, type User } from "@scouterna/wsj27-campfire-utils"

import { fetchAccessQuery } from "../../data/fetch-access"
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
 * The signed-in person a story reads as, by member number – only what the cases screens
 * read of them.
 * @param memberNo Their member number.
 * @param roles Their roles.
 * @returns The person.
 */
function storyUser(memberNo: string, roles: readonly Role[]): User {
  return {
    firstName: "Helena",
    memberNo,
    name: "Helena Hägg",
    roleLine: "CMT",
    roleLineWithUnit: "CMT",
    roles,
  }
}

/**
 * What a story says about the services behind it, under `parameters.api`. Every answer is
 * in the service's own wire shape, because that is what the cache holds.
 */
export interface ApiParameters extends NetworkParameters {
  /**
   * Who can open each case, by the case's identifier.
   */
  readonly access?: Readonly<Record<string, readonly number[]>>
  /**
   * Every case, open and closed, newest first. The list without the closed ones is
   * derived from it.
   */
  readonly cases?: readonly Readonly<Record<string, unknown>>[]
  /**
   * The reader's member number, for a story that says which cases are theirs. Nobody is
   * signed in when unsaid.
   */
  readonly memberNo?: string
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
    const accessByCase = Object.entries(api.access ?? {})
    for (const [caseId, memberNos] of accessByCase) {
      client.setQueryData(fetchAccessQuery(caseId).queryKey, memberNos)
    }
    const notesByCase = Object.entries(api.notes ?? {})
    for (const [caseId, notes] of notesByCase) {
      client.setQueryData(fetchNotesQuery(caseId).queryKey, notes)
    }
  },
  service: "/api/project/",
  wrap: (story, api) => {
    const roles = api.roles ?? healthTeam
    return (
      <RolesProvider roles={roles}>
        {api.memberNo === undefined ? (
          story
        ) : (
          <UserProvider user={storyUser(api.memberNo, roles)}>{story}</UserProvider>
        )}
      </RolesProvider>
    )
  },
})
