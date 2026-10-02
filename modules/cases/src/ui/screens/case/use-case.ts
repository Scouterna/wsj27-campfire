import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchCasesQuery } from "../../../data/fetch-cases"
import { fetchNotesQuery } from "../../../data/fetch-notes"
import { fetchPeopleQuery } from "../../../data/fetch-people"
import type { Case } from "../../../model/Case"
import type { Note } from "../../../model/Note"
import type { People } from "../../../model/Person"

/**
 * What the case screen needs to draw itself: the case and its notes, or the states they
 * are in instead.
 */
export interface CaseView {
  /**
   * Why the cases could not be read, or null while they can be – including when a fresh
   * read failed but an earlier answer is still here to show.
   */
  readonly error: Error | null
  /**
   * The case, once it has arrived. Undefined after it settled means no case the reader
   * may see has this identifier.
   */
  readonly found: Case | undefined
  /**
   * Whether the case is still on its way – including while a fresh read looks for a case
   * the cached list has not heard of, such as one opened a moment ago.
   */
  readonly isPending: boolean
  /**
   * The case's notes, newest first.
   */
  readonly notes: readonly Note[]
  /**
   * Why the notes could not be read, or null while they can be.
   */
  readonly notesError: Error | null
  /**
   * Whether the notes are still on their way.
   */
  readonly notesPending: boolean
  /**
   * Everyone a case or a note names, undefined until the names arrive.
   */
  readonly people: People | undefined
}

/**
 * One case and its notes, with the contingent's names beside them. The service answers
 * no single case, so the case is found in the list that holds the closed ones too.
 * @param caseId The case to read, as the address carries it.
 * @returns The case, its notes, the names, and the states around them.
 */
export function useCase(caseId: string): CaseView {
  const cases = useQuery(fetchCasesQuery(true))
  const notes = useQuery(fetchNotesQuery(caseId))
  const { data: people } = useQuery(fetchPeopleQuery())

  const found = cases.data?.find((item) => item.id === caseId)
  const sortedNotes = useMemo(
    () =>
      (notes.data ?? []).toSorted(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      ),
    [notes.data],
  )

  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: cases.data === undefined ? cases.error : null,
    found,
    isPending: cases.isPending || (found === undefined && cases.isFetching),
    notes: sortedNotes,
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    notesError: notes.data === undefined ? notes.error : null,
    notesPending: notes.isPending,
    people,
  }
}
