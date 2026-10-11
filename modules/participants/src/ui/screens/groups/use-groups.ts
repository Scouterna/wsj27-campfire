import { useMemo } from "react"

import {
  findGroup,
  groupEntries,
  groupLabelOf,
  type Group,
  type GroupEntry,
} from "../../../model/groups"
import { useParticipants, type ParticipantsView } from "../participants/use-participants"

/**
 * The groups view's rows, and the states of the one list they are derived from.
 */
export interface GroupEntriesView extends Pick<
  ParticipantsView,
  "error" | "isPending" | "refetch"
> {
  /**
   * The entries, in the order the view lists them.
   */
  readonly entries: readonly GroupEntry[]
}

/**
 * One group's people, and the states of the one list they are derived from.
 */
export interface GroupView extends Pick<ParticipantsView, "error" | "isPending" | "refetch"> {
  /**
   * The group's label and people, or undefined when no group has that key.
   */
  readonly group: Group | undefined
}

/**
 * What a group key is called when no group has it – a unit nobody in the viewer's scope
 * is in, or a key that is not one at all.
 *
 * The view's own labels come from the entries; this is only for the screen behind a key
 * that resolved to nothing, which still has to call itself something.
 * @param key The key the address carried.
 * @returns What to title the screen.
 */
export function groupLabel(key: string): string {
  return groupLabelOf(key) ?? "Gruppen"
}

/**
 * The groups view's rows, derived from the list the section already fetched – browsing
 * the groups costs no request.
 * @returns The entries, and the list's states.
 */
export function useGroupEntries(): GroupEntriesView {
  const { error, isPending, people, refetch } = useParticipants()
  const entries = useMemo(() => groupEntries(people), [people])

  return { entries, error, isPending, refetch }
}

/**
 * One group's people, resolved from its key against the same already-fetched list.
 * @param key The key the address carries – a unit number, `"ist-"` and a patrol number,
 *   `"ist"`, or `"cmt-"` and a funktion.
 * @returns The group, and the list's states.
 */
export function useGroup(key: string): GroupView {
  const { error, isPending, people, refetch } = useParticipants()
  const group = useMemo(() => findGroup(people, key), [key, people])

  return { error, group, isPending, refetch }
}
