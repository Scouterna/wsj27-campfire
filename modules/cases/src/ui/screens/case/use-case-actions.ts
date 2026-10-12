import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"

import { addNote, closeCase, renameCase, reopenCase, shareCase } from "../../../data/mutations"
import { refreshCases } from "../../../data/refresh-cases"
import type { SecrecyLevel } from "../../../model/SecrecyLevel"

/**
 * What the case screen can do to a case, and how that is going.
 */
export interface CaseActions {
  /**
   * Writes a note on the case under its title – at a level above the case's when one is
   * given – then calls `onAdded` so the screen can empty the field it came from.
   */
  readonly addNote: (
    text: string,
    title: string,
    level: SecrecyLevel | undefined,
    onAdded: () => void,
  ) => void
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
  /**
   * Shares the case with exactly these people, then calls `onShared`, when there is one,
   * so the screen can put the search away.
   */
  readonly share: (memberNos: readonly string[], onShared?: () => void) => void
}

/**
 * The writes the case screen makes – a note, a new title, who it is shared with, closing,
 * and reopening – each followed by a fresh read of the case and its notes. The read
 * follows a failure too, because a 409 means the case changed under the reader, and what
 * it is now is worth showing.
 * @param caseId The case to act on.
 * @returns The actions, and how they are going.
 */
export function useCaseActions(caseId: string): CaseActions {
  const client = useQueryClient()
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const refresh = useCallback(async () => refreshCases(client), [client])

  const adding = useMutation({
    mutationFn: async (input: {
      readonly level: SecrecyLevel | undefined
      readonly text: string
      readonly title: string
    }) => addNote(caseId, input.text, input.title, input.level),
    onSettled: refresh,
  })
  const closing = useMutation({ mutationFn: async () => closeCase(caseId), onSettled: refresh })
  const renaming = useMutation({
    mutationFn: async (title: string) => renameCase(caseId, title),
    onSettled: refresh,
  })
  const reopening = useMutation({ mutationFn: async () => reopenCase(caseId), onSettled: refresh })
  const sharing = useMutation({
    mutationFn: async (memberNos: readonly string[]) => shareCase(caseId, memberNos),
    onSettled: refresh,
  })

  const { mutate: add } = adding
  const { mutate: close } = closing
  const { mutate: retitle } = renaming
  const { mutate: reopen } = reopening
  const { mutate: shareWith } = sharing

  const writeNote = useCallback(
    (text: string, title: string, level: SecrecyLevel | undefined, onAdded: () => void): void => {
      setFailure(undefined)
      add(
        { level, text, title },
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

  const shareIt = useCallback(
    (memberNos: readonly string[], onShared?: () => void): void => {
      setFailure(undefined)
      shareWith(memberNos, {
        onError: () => {
          setFailure("Delningen kunde inte sparas.")
        },
        ...(onShared !== undefined && { onSuccess: onShared }),
      })
    },
    [shareWith],
  )

  return {
    addNote: writeNote,
    close: closeIt,
    failure,
    isBusy:
      adding.isPending ||
      closing.isPending ||
      renaming.isPending ||
      reopening.isPending ||
      sharing.isPending,
    rename: renameIt,
    reopen: reopenIt,
    share: shareIt,
  }
}
