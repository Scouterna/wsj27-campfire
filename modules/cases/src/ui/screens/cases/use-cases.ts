import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import { fetchCasesQuery } from "../../../data/fetch-cases"
import type { Case } from "../../../model/Case"
import type { People } from "../../../model/Person"
import { usePeople } from "../../use-people"

/**
 * What the list of cases needs to draw itself: every case, the names to show them with,
 * and the states that are not a list at all. The cases and the names are read apart, so
 * each has states of its own.
 */
export interface CasesView {
  /**
   * Every case, open and closed, in no particular order. The screen narrows and orders
   * them itself, so a change of filter never waits on the network.
   */
  readonly cases: readonly Case[]
  /**
   * Why the cases could not be read, or null while they can be – including when a fresh
   * read failed but an earlier answer is still here to show.
   */
  readonly error: Error | null
  /**
   * Whether the first answer is still on its way.
   */
  readonly isPending: boolean
  /**
   * Whether the first answer with the names is still on its way.
   */
  readonly isPeoplePending: boolean
  /**
   * Everyone the cases can be about, undefined until the names arrive – the rows name
   * people by member number until then.
   */
  readonly people: People | undefined
  /**
   * Why the names could not be read, or null while they can be – including when a fresh
   * read failed but an earlier answer is still here to show.
   */
  readonly peopleError: Error | null
  /**
   * Asks again for the cases, for the control a failed screen offers.
   */
  readonly refetch: () => void
  /**
   * Asks again for the names, for the control a screen offers when they failed.
   */
  readonly refetchPeople: () => void
}

/**
 * The cases the reader's roles reach, open and closed, with the names in their reach
 * beside them.
 * @returns The cases, the names, and the states around them.
 */
export function useCases(): CasesView {
  const { data, error, isPending, refetch } = useQuery(fetchCasesQuery(true))
  const names = usePeople()
  const refetchNames = names.refetch

  const again = useCallback(() => {
    void refetch()
  }, [refetch])
  const againPeople = useCallback(() => {
    void refetchNames()
  }, [refetchNames])

  return {
    cases: data ?? [],
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    isPeoplePending: names.isPending,
    people: names.data,
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    peopleError: names.data === undefined ? names.error : null,
    refetch: again,
    refetchPeople: againPeople,
  }
}
