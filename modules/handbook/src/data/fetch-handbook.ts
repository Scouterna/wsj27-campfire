import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import { inReadingOrder, type HandbookPage } from "../model/Handbook"
import { hasMorePages, toHandbookPages } from "./dto/InfoPageDto"
import { embedImages, loadAsDataAddress } from "./embed-images"

/**
 * The key the whole handbook is cached under.
 */
type HandbookQueryKey = readonly ["handbook", "pages"]

// Every page at once, content, chapters, and pictures included. The handbook is a few
// hundred kilobytes and read in a field with poor coverage, so one answer that the cache
// keeps beats one per page opened – every page is there offline once it was read. The
// limit is set well above the handbook's length, so in practice it is a single read.
const address = "/services/cms/api/info-page?depth=1&limit=1000&sort=position"

// The most reads one handbook is given. A listing that still claims more after this many
// is not one to follow further.
const mostReads = 20

/**
 * Reads every page of the handbook, following the CMS's listing past its first answer
 * should the handbook ever outgrow it, so no page is silently left out.
 * @returns The pages, in the order the CMS lists them.
 */
async function readPages(): Promise<readonly HandbookPage[]> {
  const pages: HandbookPage[] = []
  for (let read = 1; read <= mostReads; read += 1) {
    const answer = await fetch<unknown>(read === 1 ? address : `${address}&page=${String(read)}`)
    pages.push(...toHandbookPages(answer))
    if (!hasMorePages(answer)) {
      break
    }
  }
  return pages
}

/**
 * Query options for the whole handbook: every published page with its chapter and its
 * content, its images inside it, in reading order. Reading it needs no session – the
 * CMS publishes the handbook openly.
 * @returns Options for `useQuery`.
 */
export function fetchHandbookQuery(): UseQueryOptions<
  readonly HandbookPage[],
  Error,
  readonly HandbookPage[],
  HandbookQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<readonly HandbookPage[]> => {
      return embedImages(inReadingOrder(await readPages()), loadAsDataAddress)
    },
    queryKey: ["handbook", "pages"] as const,
  })
}
