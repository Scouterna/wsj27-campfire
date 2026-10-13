import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { fetchParticipantQuery } from "../../../data/fetch-participant"
import { fetchParticipantsQuery } from "../../../data/fetch-participants"
import { useViewer } from "../../../data/viewer"
import type { Participant } from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import type { ParticipantsList } from "../../../model/ParticipantsList"

/**
 * What the screen needs to draw itself: the record, or the state it is in instead.
 */
export interface ParticipantView {
  /**
   * Why the record could not be read – a member number nobody holds, one outside the
   * viewer's scope, or a payload that is not a person. The screen words all of them the
   * same way, so what this holds never reaches a reader. Null when a fresh read failed but
   * an earlier record is still here to show.
   */
  readonly error: Error | null
  /**
   * Whether the record is still on its way.
   */
  readonly isPending: boolean
  /**
   * The person, once they have arrived.
   */
  readonly participant: ParticipantDetail | undefined
  /**
   * The person's row in the list of participants already on the phone, for the screen to
   * stand on while the record is on its way – so a push from the list arrives with the
   * person's name rather than a placeholder. Undefined when the list holds nobody by that
   * number, or has not been read.
   */
  readonly summary: Participant | undefined
}

/**
 * One person, fetched by member number – the screen's whole dependency on the outside
 * world.
 * @param memberNo Whose record to read.
 * @returns The record, or the state the screen draws instead.
 */
export function useParticipant(memberNo: string): ParticipantView {
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const { data, error, isPending } = useQuery(fetchParticipantQuery(memberNo, viewer))
  // Read straight from the cache rather than observed, because the list is only a stand-in
  // and is never worth asking the network for here.
  const summary = isPending
    ? queryClient
        .getQueryData<ParticipantsList>(fetchParticipantsQuery(viewer).queryKey)
        ?.people.find((person) => person.memberNo === memberNo)
    : undefined

  // A read that failed with an earlier record in hand keeps showing that record, because
  // what the phone already had is worth more in a field than an error.
  // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
  return { error: data === undefined ? error : null, isPending, participant: data, summary }
}

/**
 * Reads a record into the cache ahead of the screen that shows it.
 * @param queryClient The application's query client.
 * @param query The record's query.
 */
async function readAhead(
  queryClient: QueryClient,
  query: ReturnType<typeof fetchParticipantQuery>,
): Promise<void> {
  try {
    await queryClient.query(query)
  } catch {
    // A read that fails here fails again where the screen reads the record, and the
    // screen says so.
  }
}

/**
 * Starts reading a person's record the moment a row that opens it is pressed, so the
 * record is usually on the phone by the time the page slides in.
 * @returns What a row calls with the member number it opens.
 */
export function usePrefetchParticipant(): (memberNo: string) => void {
  const viewer = useViewer()
  const queryClient = useQueryClient()
  return useCallback(
    (memberNo: string) => {
      const query = fetchParticipantQuery(memberNo, viewer)
      // A record already on the phone draws at once, and the screen reads it afresh as
      // it mounts, so asking here as well would only ask twice.
      if (viewer.memberNo === "" || queryClient.getQueryData(query.queryKey) !== undefined) {
        return
      }
      void readAhead(queryClient, query)
    },
    [queryClient, viewer],
  )
}
