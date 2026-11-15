import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import { fetchFaqQuery } from "../data/fetch-faq"
import type { FaqFolder } from "../model/Faq"

/**
 * What an FAQ screen needs: the folders, and the states that are not an FAQ at all.
 */
export interface FaqView {
  /**
   * Why the FAQ could not be read, or null while it can be – including when a fresh read
   * failed but an earlier answer is still here to show.
   */
  readonly error: Error | null
  /**
   * Every folder with its questions, in reading order, empty until it has been read.
   */
  readonly folders: readonly FaqFolder[]
  /**
   * Whether the first answer is still on its way.
   */
  readonly isPending: boolean
  /**
   * Asks again, for the control a failed screen offers.
   */
  readonly refetch: () => void
}

/**
 * The whole FAQ, read once and shared by the contents and every folder, so opening a
 * folder costs no request of its own.
 * @returns The folders, and the states around them.
 */
export function useFaq(): FaqView {
  const { data, error, isPending, refetch } = useQuery(fetchFaqQuery())

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  // An older FAQ is worth more to a leader in a field than an error, so a failed fresh
  // read keeps showing what was read before.
  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    folders: data ?? [],
    isPending,
    refetch: again,
  }
}
