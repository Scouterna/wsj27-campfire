import { unitName } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useMemo } from "react"

import { unitNumberOf, type Person } from "../../../model/Person"
import { usePeople } from "../../use-people"
import { matchingUnits } from "./unit-search"

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
   * The people whose name holds the search, or whose unit it names, alphabetically and at
   * most a screenful. Nobody while the search is empty, unless everyone is listed.
   */
  readonly matches: readonly Person[]
  /**
   * Asks for the contingent again, for the control a failed search offers.
   */
  readonly refetch: () => void
  /**
   * How many people matched in all, beyond the screenful shown.
   */
  readonly total: number
  /**
   * The units on offer that the search names, lowest first.
   */
  readonly units: readonly number[]
}

/**
 * Everyone within the reader's reach who may be chosen and whose name holds the search
 * text, or whose unit it names – by its exact number or its name – and the units on offer
 * it names.
 * @param query What the reader typed. Surrounding spaces and case are ignored.
 * @param isOffered Whether a person may be chosen at all. Left out, everyone within reach
 * may. Kept stable across renders, because the matches are recomputed when it changes.
 * @param offeredUnits The units that may be chosen as a whole, lowest first. Left out,
 * none may, though a unit's people are still found by it.
 * @param isListed Whether everyone offered is listed before anything is typed, and then
 * narrowed by name alone – for a reader who leads one unit, whose people are few and
 * known to them, and whose unit is no search result but a choice of its own. Every match
 * is listed then, without the cap, and no unit is matched.
 * @returns The matches, and the states around them.
 */
export function usePeopleSearch(
  query: string,
  isOffered?: (person: Person) => boolean,
  offeredUnits?: readonly number[],
  isListed = false,
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
  const named = useMemo(() => {
    if (isListed) {
      return []
    }
    const known = new Set([
      ...everyone.flatMap((person) => unitNumberOf(person) ?? []),
      ...(offeredUnits ?? []),
    ])
    return matchingUnits(
      [...known].toSorted((left, right) => left - right),
      needle,
      unitName,
    )
  }, [everyone, isListed, needle, offeredUnits])
  const found = useMemo(() => {
    if (needle === "") {
      return isListed ? everyone : []
    }
    const inUnits = new Set(named)
    return everyone.filter((person) => {
      const unit = unitNumberOf(person)
      return (
        person.name.toLocaleLowerCase("sv").includes(needle) ||
        (unit !== undefined && inUnits.has(unit))
      )
    })
  }, [everyone, isListed, named, needle])
  const units = useMemo(
    () => named.filter((unit) => offeredUnits?.includes(unit) === true),
    [named, offeredUnits],
  )

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    matches: isListed ? found : found.slice(0, shownAtMost),
    refetch: again,
    total: found.length,
    units,
  }
}
