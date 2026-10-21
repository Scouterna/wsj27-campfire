import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { FaqFolder } from "../model/Faq"
import { toFaqFolder } from "./dto/FolderDto"

/**
 * The folders of the WSJ 2027 category in Scouterna's help center. The help center
 * publishes each folder as JSON anyone may read from any origin, but not the category
 * that lists them, and its pages refuse a read from another origin – so a folder added
 * there reaches Campfire only once its id is added here.
 */
export const faqFolders = [
  75_000_018_603, 75_000_018_600, 75_000_018_599, 75_000_018_601, 75_000_018_604, 75_000_018_608,
  75_000_018_609, 75_000_020_780,
] as const

/**
 * Where the help center publishes a folder, with every article in it.
 * @param id The folder's id.
 * @returns The folder's address.
 */
export function folderAddress(id: number): string {
  return `https://support.scouterna.se/support/solutions/folders/${String(id)}.json`
}

/**
 * The key the whole FAQ is cached under.
 */
type FaqQueryKey = readonly ["faq", "folders"]

/**
 * Query options for the whole FAQ: every folder with every question and its answer, in
 * the help center's order, read straight from the help center by the browser.
 *
 * One query rather than one per folder, so the cache persists the whole FAQ the first
 * time any of it is opened, and every answer is there on a camp site with no coverage. A
 * folder that cannot be read fails the whole read, because an FAQ missing a folder looks
 * complete to whoever reads it.
 * @returns Options for `useQuery`.
 */
export function fetchFaqQuery(): UseQueryOptions<
  readonly FaqFolder[],
  Error,
  readonly FaqFolder[],
  FaqQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<readonly FaqFolder[]> => {
      const payloads = await Promise.all(
        faqFolders.map(async (id) => fetch<unknown>(folderAddress(id))),
      )
      return payloads
        .map((payload) => toFaqFolder(payload))
        .filter((folder) => folder !== undefined)
        .toSorted((a, b) => a.position - b.position)
    },
    queryKey: ["faq", "folders"] as const,
  })
}
