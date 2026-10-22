import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"

import { closeCase, renameCase, reopenCase } from "../../../data/mutations"
import { refreshCases } from "../../../data/refresh-cases"
import { useNoteWrites, type NoteWrites } from "./use-note-writes"
import { usePeopleWrites, type PeopleWrites } from "./use-people-writes"

/**
 * What the case screen can do to a case, and how that is going.
 */
export interface CaseActions extends Omit<NoteWrites, "isBusy">, Omit<PeopleWrites, "isBusy"> {
  /**
   * Closes the case.
   */
  readonly close: () => void
  /**
   * What went wrong with the last attempt, in the reader's words, or undefined when
   * nothing did. Cleared by the next attempt.
   */
  readonly failure: string | undefined
  /**
   * Whether an attempt is under way, so the screen can hold its controls still.
   */
  readonly isBusy: boolean
  /**
   * Renames the case, then calls `onRenamed` so the screen can put the title away.
   */
  readonly rename: (title: string, onRenamed: () => void) => void
  /**
   * Opens a closed case again.
   */
  readonly reopen: () => void
}

/**
 * The writes the case screen makes – a note and its pictures, the people it names, a new
 * title, closing, and reopening – each followed by a fresh read of the case and its notes.
 * The read follows a failure too, because a 409 means the case changed under the reader,
 * and what it is now is worth showing.
 * @param caseId The case to act on.
 * @returns The actions, and how they are going.
 */
export function useCaseActions(caseId: string): CaseActions {
  const client = useQueryClient()
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const refresh = useCallback(async () => refreshCases(client), [client])
  const notes = useNoteWrites(caseId, refresh, setFailure)
  const named = usePeopleWrites(caseId, refresh, setFailure)

  const closing = useMutation({ mutationFn: async () => closeCase(caseId), onSettled: refresh })
  const renaming = useMutation({
    mutationFn: async (title: string) => renameCase(caseId, title),
    onSettled: refresh,
  })
  const reopening = useMutation({ mutationFn: async () => reopenCase(caseId), onSettled: refresh })
  const { mutate: close } = closing
  const { mutate: retitle } = renaming
  const { mutate: reopen } = reopening

  const closeIt = useCallback(() => {
    setFailure(undefined)
    close(undefined, {
      onError: () => {
        setFailure("Ärendet kunde inte stängas.")
      },
    })
  }, [close])
  const renameIt = useCallback(
    (title: string, onRenamed: () => void): void => {
      setFailure(undefined)
      retitle(title, {
        onError: () => {
          setFailure("Rubriken kunde inte ändras.")
        },
        onSuccess: onRenamed,
      })
    },
    [retitle],
  )
  const reopenIt = useCallback(() => {
    setFailure(undefined)
    reopen(undefined, {
      onError: () => {
        setFailure("Ärendet kunde inte öppnas igen.")
      },
    })
  }, [reopen])

  return {
    addNote: notes.addNote,
    assign: named.assign,
    attachPictures: notes.attachPictures,
    changePeople: named.changePeople,
    close: closeIt,
    failure,
    isBusy:
      notes.isBusy ||
      named.isBusy ||
      closing.isPending ||
      renaming.isPending ||
      reopening.isPending,
    rename: renameIt,
    reopen: reopenIt,
    share: named.share,
  }
}
