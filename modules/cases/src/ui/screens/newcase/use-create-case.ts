import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { createCase, type NewCase } from "../../../data/mutations"
import { refreshCases } from "../../../data/refresh-cases"
import type { Case } from "../../../model/Case"

/**
 * What the new-case form needs: the way to open the case, and how that is going.
 */
export interface CreateCaseView {
  /**
   * Opens the case, then calls `onCreated` with it once the lists know about it.
   */
  readonly create: (input: NewCase, onCreated: (created: Case) => void) => void
  /**
   * Whether the last attempt failed. Cleared by the next one.
   */
  readonly hasFailed: boolean
  /**
   * Whether an attempt is under way.
   */
  readonly isPending: boolean
}

/**
 * Opening a case, with the cached lists read again once it exists – so the case screen
 * it leads to finds it.
 * @returns The way to open a case, and how that is going.
 */
export function useCreateCase(): CreateCaseView {
  const client = useQueryClient()
  const { isError, isPending, mutate } = useMutation({
    mutationFn: createCase,
    onSettled: async () => refreshCases(client),
  })

  const create = useCallback(
    (input: NewCase, onCreated: (created: Case) => void): void => {
      mutate(input, { onSuccess: onCreated })
    },
    [mutate],
  )

  return { create, hasFailed: isError, isPending }
}
