import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"

import { addNote, closeCase, reopenCase } from "../../../data/mutations"
import { refreshCases } from "../../../data/refresh-cases"

/**
 * What the case screen can do to a case, and how that is going.
 */
export interface CaseActions {
  /**
   * Writes a note on the case under its title, then calls `onAdded` so the screen can
   * empty the field it came from.
   */
  readonly addNote: (text: string, title: string, onAdded: () => void) => void
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
   * Opens a closed case again.
   */
  readonly reopen: () => void
}

/**
 * The writes the case screen makes – a note, closing, and reopening – each followed by a
 * fresh read of the case and its notes. The read follows a failure too, because a 409
 * means the case changed under the reader, and what it is now is worth showing.
 * @param caseId The case to act on.
 * @returns The actions, and how they are going.
 */
export function useCaseActions(caseId: string): CaseActions {
  const client = useQueryClient()
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const refresh = useCallback(async () => refreshCases(client), [client])

  const adding = useMutation({
    mutationFn: async (input: { readonly text: string; readonly title: string }) =>
      addNote(caseId, input.text, input.title),
    onSettled: refresh,
  })
  const closing = useMutation({ mutationFn: async () => closeCase(caseId), onSettled: refresh })
  const reopening = useMutation({ mutationFn: async () => reopenCase(caseId), onSettled: refresh })

  const { mutate: add } = adding
  const { mutate: close } = closing
  const { mutate: reopen } = reopening

  const writeNote = useCallback(
    (text: string, title: string, onAdded: () => void): void => {
      setFailure(undefined)
      add(
        { text, title },
        {
          onError: () => {
            setFailure("Anteckningen kunde inte sparas.")
          },
          onSuccess: onAdded,
        },
      )
    },
    [add],
  )
  const closeIt = useCallback(() => {
    setFailure(undefined)
    close(undefined, {
      onError: () => {
        setFailure("Ärendet kunde inte stängas.")
      },
    })
  }, [close])
  const reopenIt = useCallback(() => {
    setFailure(undefined)
    reopen(undefined, {
      onError: () => {
        setFailure("Ärendet kunde inte öppnas igen.")
      },
    })
  }, [reopen])

  return {
    addNote: writeNote,
    close: closeIt,
    failure,
    isBusy: adding.isPending || closing.isPending || reopening.isPending,
    reopen: reopenIt,
  }
}
