import { useQuery } from "@tanstack/react-query"

import { fetchFaqQuery } from "../data/fetch-faq"
import { fetchHandbookQuery } from "../data/fetch-handbook"

/**
 * Reads the whole handbook and the whole FAQ as soon as the application starts, so both
 * are kept on the device before anyone opens them – a leader who never looked at the
 * handbook at home still has all of it on the island. Each start with a connection
 * renews them, and a start without one keeps what was kept.
 * @returns Nothing – it only reads.
 */
export function HandbookOffline(): null {
  useQuery(fetchHandbookQuery())
  useQuery(fetchFaqQuery())
  return null
}
