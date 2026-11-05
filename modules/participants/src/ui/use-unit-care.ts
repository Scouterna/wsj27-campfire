import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchUnitDetailsQuery } from "../data/fetch-unit-details"
import { useViewer } from "../data/viewer"
import { careOf, type Care } from "../model/Care"
import { notesToLeader } from "../model/Note"
import type { ParticipantDetail } from "../model/ParticipantDetail"

/**
 * One person's care needs, beside the record they were read from.
 */
export interface CareRecord {
  /**
   * What they need.
   */
  readonly care: Care
  /**
   * Their record, with the notes a leader's lists show.
   */
  readonly person: ParticipantDetail
}

/**
 * The care the leader's unit needs, and whether it could be read.
 */
export interface UnitCare {
  /**
   * Each person who needs any care, by member number. Nobody who declared nothing is
   * here, so a row without an entry has nothing to show.
   */
  readonly byMemberNo: ReadonlyMap<string, CareRecord>
  /**
   * Whether the records could not be read, so the screen can say that nobody's care is
   * shown rather than let an empty map read as a unit with no needs.
   */
  readonly isUnknown: boolean
}

/**
 * The care every person in the leader's own unit needs, read from their records in full.
 * One listing for the whole unit, so a list calls this once and hands each row its entry
 * rather than each row calling it, or every row a virtual list mounts would ask again.
 * Asks nothing for a viewer who leads no unit, whose map stays empty, and a person outside
 * the unit, or a fellow leader whose answers are withheld, has no entry either.
 * @returns The care by member number, and whether it could be read.
 */
export function useUnitCare(): UnitCare {
  const viewer = useViewer()
  const { data, error } = useQuery(fetchUnitDetailsQuery(viewer))
  const byMemberNo = useMemo(() => {
    const cares = new Map<string, CareRecord>()
    const people = data ?? []
    for (const person of people) {
      // Narrowed on the record, so the mark and the sheet it opens say the same thing.
      const notes = notesToLeader(person.notes)
      const care = careOf(person.health, notes)
      if (care.needs.length > 0) {
        cares.set(person.memberNo, { care, person: { ...person, notes } })
      }
    }
    return cares
  }, [data])
  return { byMemberNo, isUnknown: error !== null && data === undefined }
}
