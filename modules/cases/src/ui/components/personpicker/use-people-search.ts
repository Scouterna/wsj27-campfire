import { useCallback, useMemo } from "react"

import type { Person } from "../../../model/Person"
import { usePeople } from "../../use-people"

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
 * Everyone within the reader's reach who may be chosen and whose name holds the search
 * text.
 * @param query What the reader typed. Surrounding spaces and case are ignored.
 * @param isOffered Whether a person may be chosen at all. Left out, everyone within reach
 * may. Kept stable across renders, because the matches are recomputed when it changes.
 * @returns The matches, and the states around them.
 */
export function usePeopleSearch(
  query: string,
  isOffered?: (person: Person) => boolean,
): PeopleSearchView {
  const { data, error, isPending, refetch } = usePeople()

  const everyone = useMemo(
    () =>
      [...(data?.values() ?? [])]
        .filter((person) => isOffered === undefined || isOffered(person))
        .toSorted((left, right) => swedish.compare(left.name, right.name)),
    [data, isOffered],
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
