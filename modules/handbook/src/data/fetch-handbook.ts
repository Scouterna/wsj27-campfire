import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import { inReadingOrder, type HandbookPage } from "../model/Handbook"
import { toHandbookPages } from "./dto/InfoPageDto"

/**
 * The key the whole handbook is cached under.
 */
type HandbookQueryKey = readonly ["handbook", "pages"]

// Every page in one read, content and chapters included. The handbook is a few hundred
// kilobytes and read in a field with poor coverage, so one read that the cache keeps
// beats one per page opened – every page is there offline once the contents were seen.
// The limit is the CMS's page size, set well above the handbook's length, since a
// handbook that outgrew it would silently lose its last pages.
const address = "/_services/cms/api/info-page?depth=1&limit=1000&sort=position"

/**
 * Query options for the whole handbook: every published page with its chapter and its
 * content, in reading order. Reading it needs no session – the CMS publishes the
 * handbook openly.
 * @returns Options for `useQuery`.
 */
export function fetchHandbookQuery(): UseQueryOptions<
  readonly HandbookPage[],
  Error,
  readonly HandbookPage[],
  HandbookQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<readonly HandbookPage[]> =>
      inReadingOrder(toHandbookPages(await fetch<unknown>(address))),
    queryKey: ["handbook", "pages"] as const,
  })
}
