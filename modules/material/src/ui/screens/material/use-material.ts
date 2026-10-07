import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import { fetchMaterialQuery } from "../../../data/fetch-material"
import type { MaterialNode } from "../../../model/MaterialNode"

/**
 * The material tree, and the states a screen draws around it.
 */
export interface MaterialView {
  /**
   * Why the tree could not be read, or null while it can be – including when a fresh read
   * failed but an earlier answer is still here to show.
   */
  readonly error: Error | null
  /**
   * Whether the first answer is still on its way.
   */
  readonly isPending: boolean
  /**
   * The tree's top level, empty until it has been read.
   */
  readonly nodes: readonly MaterialNode[]
  /**
   * Asks again, for the control a failed screen offers.
   */
  readonly refetch: () => void
}

/**
 * The material tree every screen in the module reads, so a folder screen browses the
 * same cached answer the start screen searched.
 * @returns The tree, and the states around it.
 */
export function useMaterial(): MaterialView {
  const { data, error, isPending, refetch } = useQuery(fetchMaterialQuery())

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  // A read that failed with an earlier answer in hand keeps showing that answer, because
  // the material a phone saw last is worth more in a field than an error.
  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    nodes: data ?? [],
    refetch: again,
  }
}
