import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { fetchPeopleQuery } from "../../../data/fetch-people"
import type { Person } from "../../../model/Person"

/**
 * The most people a search shows at once. A few letters match hundreds in a contingent,
 * and nobody picks from hundreds – they type more.
 */
const shownAtMost = 20

// Constructed once, because a collator is expensive to build and the whole contingent is
// sorted with it.
const swedish = new Intl.Collator("sv")

/**
 * What the person picker needs: who matched, and the states that are not an answer.
 */
export interface PeopleSearchView {
  /**
   * Why the contingent could not be read, or null while it can be.
   */
  readonly error: Error | null
  /**
   * Whether the contingent is still on its way.
   */
  readonly isPending: boolean
  /**
   * The people whose name holds the search, alphabetically and at most a screenful.
   * Nobody while the search is empty.
   */
  readonly matches: readonly Person[]
  /**
   * Asks for the contingent again, for the control a failed search offers.
   */
  readonly refetch: () => void
  /**
   * How many matched in all, beyond the screenful shown.
   */
  readonly total: number
}

/**
 * Everyone in the contingent whose name holds the search text.
 * @param query What the reader typed. Surrounding spaces and case are ignored.
 * @returns The matches, and the states around them.
 */
export function usePeopleSearch(query: string): PeopleSearchView {
  const { data, error, isPending, refetch } = useQuery(fetchPeopleQuery())

  const everyone = useMemo(
    () =>
      [...(data?.values() ?? [])].toSorted((left, right) => swedish.compare(left.name, right.name)),
    [data],
  )

  const needle = query.trim().toLocaleLowerCase("sv")
  const found = useMemo(
    () =>
      needle === ""
        ? []
        : everyone.filter((person) => person.name.toLocaleLowerCase("sv").includes(needle)),
    [everyone, needle],
  )

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    matches: found.slice(0, shownAtMost),
    refetch: again,
    total: found.length,
  }
}
