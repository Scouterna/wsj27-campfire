import { useQuery } from "@tanstack/react-query"

import { fetchParticipantQuery } from "../../../data/fetch-participant"
import { useViewer } from "../../../data/viewer"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"

/**
 * What the screen needs to draw itself: the record, or which of the two states it is in
 * instead.
 */
export interface ParticipantView {
  /**
   * Why the record could not be read – a member number nobody holds, one outside the
   * viewer's scope, or a payload that is not a person. The screen words all of them the
   * same way, so what this holds never reaches a reader.
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
}

/**
 * One person, fetched by member number – the screen's whole dependency on the outside
 * world.
 * @param memberNo Whose record to read.
 * @returns The record, or the state the screen draws instead.
 */
export function useParticipant(memberNo: string): ParticipantView {
  const viewer = useViewer()
  const { data, error, isPending } = useQuery(fetchParticipantQuery(memberNo, viewer))

  return { error, isPending, participant: data }
}
