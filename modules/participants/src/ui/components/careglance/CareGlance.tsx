import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"

import { fetchParticipantQuery } from "../../../data/fetch-participant"
import { useViewer } from "../../../data/viewer"
import { careOf } from "../../../model/Care"
import { notesToLeader } from "../../../model/Note"
import { PersonCare } from "../personcare/PersonCare"

/**
 * Whose care a `CareGlance` looks up.
 */
export interface CareGlanceProps {
  /**
   * The person, by member number.
   */
  readonly memberNo: string
}

/**
 * One person's care where all that is known is their member number, for any reader who
 * may read their health answers – one with a health grant, or a leader of the person's own
 * unit, since the service answers a leader's read of anybody else as nobody. It reads the
 * same record the person's page does, so a copy already held stays on show when a later
 * read fails. It draws nothing for anybody else, nor while the record is on its way, nor
 * where no copy is held and it could not be read, nor where it was stepped down to the
 * level without health or declares nothing, because here silence stands for not knowing
 * rather than for an all-clear.
 * @param props The person.
 * @returns The care, or nothing.
 */
export function CareGlance(props: CareGlanceProps): ReactElement | null {
  const viewer = useViewer()
  const query = fetchParticipantQuery(props.memberNo, viewer)
  const canRead = viewer.readsHealth || viewer.unitNumber !== undefined
  const { data } = useQuery({ ...query, enabled: canRead && viewer.memberNo !== "" })

  if (!canRead || data?.health === undefined) {
    return null
  }
  // A leader is shown the notes their own lists show, so the mark here and on the lists
  // agree; only a health reader reads what was addressed to the management alone.
  const notes = viewer.readsHealth ? data.notes : notesToLeader(data.notes)
  const care = careOf(data.health, notes)
  return care.needs.length === 0 ? null : <PersonCare care={care} person={{ ...data, notes }} />
}
