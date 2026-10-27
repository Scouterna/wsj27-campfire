import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { assignCase } from "../../../data/mutations"
import { refreshCases } from "../../../data/refresh-cases"

/**
 * Taking a case on from a list of them, and how that is going.
 */
export interface TakeCase {
  /**
   * Whether the last attempt failed, until the next.
   */
  readonly hasFailed: boolean
  /**
   * Makes the reader responsible for a case. The lists read again however it settles, so
   * a case someone else took meanwhile shows as theirs.
   */
  readonly take: (caseId: string) => void
  /**
   * The case being taken on, undefined while none is.
   */
  readonly takingId: string | undefined
}

/**
 * The reader taking a case on from its row.
 * @returns What taking does, and how it is going.
 */
export function useTakeCase(): TakeCase {
  const client = useQueryClient()
  const reader = useUser()
  const taking = useMutation({
    mutationFn: async (caseId: string) => assignCase(caseId, reader?.memberNo),
    onSettled: async () => refreshCases(client),
  })
  return {
    hasFailed: taking.isError,
    take: (caseId) => {
      if (reader !== undefined) {
        taking.mutate(caseId)
      }
    },
    takingId: taking.isPending ? taking.variables : undefined,
  }
}
