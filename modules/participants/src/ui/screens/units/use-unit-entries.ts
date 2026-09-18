import { useMemo } from "react"

import { unitEntries, unitGroup, type UnitEntry, type UnitGroup } from "../../../model/unit-entries"
import { useParticipants, type ParticipantsView } from "../participants/use-participants"

/**
 * The unit browser's rows, and the states of the one list they are derived from.
 */
export interface UnitEntriesView extends Pick<ParticipantsView, "error" | "isPending" | "refetch"> {
  /**
   * The entries, in the order the browser lists them.
   */
  readonly entries: readonly UnitEntry[]
}

/**
 * One entry's people, and the states of the one list they are derived from.
 */
export interface UnitGroupView extends Pick<ParticipantsView, "error" | "isPending" | "refetch"> {
  /**
   * The entry's label and people, or undefined when no entry holds that key.
   */
  readonly group: UnitGroup | undefined
}

/**
 * What an entry key is called when no entry holds it – a unit nobody in the viewer's
 * scope is in, or a key that is not one at all.
 *
 * The browser's own labels come from the entries; this is only for the screen behind a
 * key that resolved to nothing, which still has to call itself something.
 * @param key The key the address carried.
 * @returns What to title the screen.
 */
export function entryLabel(key: string): string {
  if (key === "ist") {
    return "IST"
  }
  if (key === "cmt") {
    return "CMT"
  }
  return /^\d+$/u.test(key) ? `Avdelning ${key}` : "Avdelningen"
}

/**
 * The unit browser's rows, derived from the list the section already fetched – browsing
 * the units costs no request.
 * @returns The entries, and the list's states.
 */
export function useUnitEntries(): UnitEntriesView {
  const { error, isPending, people, refetch } = useParticipants()
  const entries = useMemo(() => unitEntries(people), [people])

  return { entries, error, isPending, refetch }
}

/**
 * One entry's people, resolved from its key against the same already-fetched list.
 * @param key The key the address carries – a unit number, `"ist"`, or `"cmt"`.
 * @returns The group, and the list's states.
 */
export function useUnitGroup(key: string): UnitGroupView {
  const { error, isPending, people, refetch } = useParticipants()
  const group = useMemo(() => unitGroup(people, key), [key, people])

  return { error, group, isPending, refetch }
}
