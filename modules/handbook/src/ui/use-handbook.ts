import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { fetchHandbookQuery } from "../data/fetch-handbook"
import { chaptersOf, type ChapterEntry, type HandbookPage } from "../model/Handbook"

/**
 * What a handbook screen needs: the chapters, and the states that are not a handbook at
 * all.
 */
export interface HandbookView {
  /**
   * Every chapter with its pages, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * Why the handbook could not be read, or null while it can be – including when a fresh
   * read failed but an earlier answer is still here to show.
   */
  readonly error: Error | null
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
 * The whole handbook, read once and shared by the contents and every chapter, so opening
 * a chapter costs no request of its own.
 * @returns The chapters, and the states around them.
 */
export function useHandbook(): HandbookView {
  return useHandbookOf(everyPage)
}

/**
 * The handbook anyone may read – only the pages the CMS publishes publicly, read by the
 * same query as the whole.
 * @returns The public chapters, and the states around them.
 */
export function usePublicHandbook(): HandbookView {
  return useHandbookOf(publicPages)
}

/**
 * Keeps every page.
 * @param pages The pages.
 * @returns The same pages.
 */
function everyPage(pages: readonly HandbookPage[]): readonly HandbookPage[] {
  return pages
}

/**
 * Keeps the pages anyone may read.
 * @param pages The pages.
 * @returns The public ones, in the same order.
 */
function publicPages(pages: readonly HandbookPage[]): readonly HandbookPage[] {
  return pages.filter((page) => page.isPublic)
}

/**
 * The handbook as some of its pages make it.
 * @param pick Which pages to keep – a stable function, so the chapters are built once per
 * answer.
 * @returns The chapters, and the states around them.
 */
function useHandbookOf(
  pick: (pages: readonly HandbookPage[]) => readonly HandbookPage[],
): HandbookView {
  const { data, error, isPending, refetch } = useQuery(fetchHandbookQuery())

  const chapters = useMemo(() => chaptersOf(pick(data ?? [])), [data, pick])

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  // An older handbook is worth more to a leader in a field than an error, so a failed
  // fresh read keeps showing what was read before.
  return {
    chapters,
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending,
    refetch: again,
  }
}
