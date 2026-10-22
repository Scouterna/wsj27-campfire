import { useMutation } from "@tanstack/react-query"
import { useCallback } from "react"

import { assignCase, changeCasePeople, shareCase } from "../../../data/mutations"

/**
 * The writes that name people on a case, and whether one is under way.
 */
export interface PeopleWrites {
  /**
   * Makes someone responsible for following the case up, or nobody, then calls
   * `onAssigned`, when there is one, so the screen can put the choice away.
   */
  readonly assign: (memberNo: string | undefined, onAssigned?: () => void) => void
  /**
   * Makes the case about exactly these people, then calls `onChanged`, when there is one,
   * so the screen can put the search away.
   */
  readonly changePeople: (memberNos: readonly string[], onChanged?: () => void) => void
  /**
   * Whether a write is under way.
   */
  readonly isBusy: boolean
  /**
   * Shares the case with exactly these people, then calls `onShared`, when there is one,
   * so the screen can put the search away.
   */
  readonly share: (memberNos: readonly string[], onShared?: () => void) => void
}

/**
 * The writes that name people on a case – who it is about, who it is shared with, and who
 * is responsible for it – each followed by a fresh read whether it went through or not.
 * @param caseId The case to act on.
 * @param refresh Reads the case and its notes afresh.
 * @param setFailure Says what went wrong, or clears it as a write starts.
 * @returns The writes, and whether one is under way.
 */
export function usePeopleWrites(
  caseId: string,
  refresh: () => Promise<void>,
  setFailure: (failure: string | undefined) => void,
): PeopleWrites {
  const assigning = useMutation({
    mutationFn: async (memberNo: string | undefined) => assignCase(caseId, memberNo),
    onSettled: refresh,
  })
  const changing = useMutation({
    mutationFn: async (memberNos: readonly string[]) => changeCasePeople(caseId, memberNos),
    onSettled: refresh,
  })
  const sharing = useMutation({
    mutationFn: async (memberNos: readonly string[]) => shareCase(caseId, memberNos),
    onSettled: refresh,
  })
  const { mutate: assignTo } = assigning
  const { mutate: changeTo } = changing
  const { mutate: shareWith } = sharing

  const assign = useCallback(
    (memberNo: string | undefined, onAssigned?: () => void): void => {
      setFailure(undefined)
      assignTo(memberNo, {
        onError: () => {
          setFailure("Ansvarig kunde inte ändras.")
        },
        ...(onAssigned !== undefined && { onSuccess: onAssigned }),
      })
    },
    [assignTo, setFailure],
  )
  const changePeople = useCallback(
    (memberNos: readonly string[], onChanged?: () => void): void => {
      setFailure(undefined)
      changeTo(memberNos, {
        onError: () => {
          setFailure("Vem ärendet gäller kunde inte ändras.")
        },
        ...(onChanged !== undefined && { onSuccess: onChanged }),
      })
    },
    [changeTo, setFailure],
  )
  const share = useCallback(
    (memberNos: readonly string[], onShared?: () => void): void => {
      setFailure(undefined)
      shareWith(memberNos, {
        onError: () => {
          setFailure("Delningen kunde inte sparas.")
        },
        ...(onShared !== undefined && { onSuccess: onShared }),
      })
    },
    [setFailure, shareWith],
  )

  return {
    assign,
    changePeople,
    isBusy: assigning.isPending || changing.isPending || sharing.isPending,
    share,
  }
}
