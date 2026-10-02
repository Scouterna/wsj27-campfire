import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Note } from "../model/Note"
import { toNotes } from "./dto/NoteDto"

/**
 * The key one case's notes are cached under, naming the case so two cases never share an
 * entry.
 */
type NotesQueryKey = readonly ["cases", "notes", string]

/**
 * Query options for one case's notes, newest first. An unknown case is a 404, which
 * the query throws as an `HttpError`.
 *
 * The cache holds the payload as it arrived and `select` converts it on the way out,
 * because the cache is persisted as JSON, and a `Date` written that way comes back a
 * string.
 * @param caseId The case whose notes to read.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or the client's `query`.
 */
export function fetchNotesQuery(
  caseId: string,
): UseQueryOptions<unknown, Error, readonly Note[], NotesQueryKey> {
  return queryOptions({
    queryFn: async (): Promise<unknown> =>
      // Encoded because the identifier arrives from the address bar, and a reserved
      // character must not rewrite the path it is asked on.
      fetch<unknown>(`/api/project/cases/${encodeURIComponent(caseId)}/notes`),
    queryKey: ["cases", "notes", caseId] as const,
    select: toNotes,
  })
}
