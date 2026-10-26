import { fetch, HttpError } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Participant } from "../model/Participant"
import type { ParticipantsList } from "../model/ParticipantsList"
import { toParticipants } from "./dto/ParticipantDto"
import type { Viewer } from "./viewer"

/**
 * The key the list is cached under. One viewer per session is what keeps it constant –
 * the cache changes owner with the sign-in rather than the key changing with the reader.
 */
type ParticipantsQueryKey = readonly ["participants", "list"]

/**
 * Query options for the list of participants as the viewer may read it.
 *
 * The participants service refuses what the caller may not read, so the viewer decides
 * which listing is asked for. A leader asks for their own unit, and the contingent
 * management for the whole contingent. Management wins over leadership for anybody who is
 * both, because the wider answer contains the narrower one.
 * @param viewer Who is reading.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or `ensureQueryData`.
 */
export function fetchParticipantsQuery(
  viewer: Viewer,
): UseQueryOptions<ParticipantsList, Error, ParticipantsList, ParticipantsQueryKey> {
  return queryOptions({
    enabled: viewer.memberNo !== "",
    queryFn: async (): Promise<ParticipantsList> => {
      if (viewer.readsEveryone) {
        return { people: await listing(""), scope: { kind: "all" } }
      }
      if (viewer.unitNumber !== undefined) {
        return {
          // Encoded because a unit number derived from a service payload must not be able
          // to rewrite the path or the query it is asked on.
          people: await listing(`/${encodeURIComponent(String(viewer.unitNumber))}`),
          scope: { kind: "unit", unitNumber: viewer.unitNumber },
        }
      }
      // Nobody the service would list anything for – every listing would come back a
      // refusal, so nothing is asked.
      return { people: [], scope: { kind: "nobody" } }
    },
    queryKey: ["participants", "list"] as const,
  })
}

/**
 * One listing's people at basic. The service answers 404 both for a listing that holds
 * nobody and for one the caller may not read, and either way the list is empty rather than
 * failed. Every other failure is thrown as it came, a 401 included, because whether to ask
 * again is the query client's call.
 * @param path The path below the listings – empty for the whole contingent, or a slash
 * and an encoded unit number.
 * @returns The people the listing holds, empty when it holds none.
 */
async function listing(path: "" | `/${string}`): Promise<readonly Participant[]> {
  try {
    const rows = await fetch<unknown>(`/api/project/participants/troopinfo${path}?infolevel=basic`)
    return toParticipants(rows)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return []
    }
    throw error
  }
}
