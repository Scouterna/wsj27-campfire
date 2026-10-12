import { useRoles } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { fetchCaseTypesQuery } from "../../../data/fetch-case-types"
import { caseTypes, type CaseScope } from "../../../model/CaseType"
import { leaderUnits } from "../../use-people"

/**
 * What the form needs to offer a case's scope: the scopes, and the states that are not
 * an answer.
 */
export interface CaseScopesView {
  /**
   * Why the types could not be read, or null while they can be.
   */
  readonly error: Error | null
  /**
   * Whether the types are still on their way.
   */
  readonly isPending: boolean
  /**
   * Asks again, for the control a failed form offers.
   */
  readonly refetch: () => void
  /**
   * The scopes the reader may open a case in, narrowest audience first.
   */
  readonly scopes: readonly CaseScope[]
}

/**
 * The scopes the signed-in person may open a case in – the types the service says their
 * roles give, with a unit's case offered once for every unit they lead, since the service
 * names the type but not the units.
 * @returns The scopes, and the states around them.
 */
export function useCaseScopes(): CaseScopesView {
  const roles = useRoles()
  const { data, error, isPending, refetch } = useQuery(fetchCaseTypesQuery())

  const scopes = useMemo(() => {
    const given = new Set(data)
    return caseTypes
      .filter((type) => given.has(type))
      .flatMap((type): readonly CaseScope[] =>
        type === "avdelning"
          ? leaderUnits(roles).map((unitNumber) => ({ type, unitNumber }))
          : [{ type }],
      )
  }, [data, roles])

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    refetch: again,
    scopes,
  }
}
