import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { fetchCasesQuery } from "../../../data/fetch-cases"
import { fetchPeopleQuery } from "../../../data/fetch-people"
import type { Case } from "../../../model/Case"
import type { People } from "../../../model/Person"

/**
 * What the list of cases needs to draw itself: every case, the names to show them with,
 * and the states that are not a list at all.
 */
export interface CasesView {
  /**
   * Every case, open and closed, newest first. The screen narrows them itself, so a
   * change of filter never waits on the network.
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
   * Everyone the cases can be about, undefined until the names arrive – the rows name
   * people by member number until then.
   */
  readonly people: People | undefined
  /**
   * Asks again, for the control a failed screen offers.
   */
  readonly refetch: () => void
}

/**
 * The cases the health team keeps, open and closed, with the contingent's names beside
 * them.
 * @returns The cases, the names, and the states around them.
 */
export function useCases(): CasesView {
  const { data, error, isPending, refetch } = useQuery(fetchCasesQuery(true))
  const { data: people } = useQuery(fetchPeopleQuery())

  const cases = useMemo(
    () =>
      (data ?? []).toSorted((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [data],
  )

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  return {
    cases,
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    people,
    refetch: again,
  }
}
