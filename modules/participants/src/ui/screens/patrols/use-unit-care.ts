import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchUnitDetailsQuery } from "../../../data/fetch-unit-details"
import { useViewer } from "../../../data/viewer"
import { careOf, type Care } from "../../../model/Care"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"

/**
 * One person's care needs, beside the record they were read from.
 */
export interface PersonCare {
  /**
   * What they need.
   */
  readonly care: Care
  /**
   * Their record in full.
   */
  readonly person: ParticipantDetail
}

/**
 * The care the leader's unit needs, and whether it could be read.
 */
export interface UnitCare {
  /**
   * Each person who needs any care, by member number. Nobody who declared nothing is
   * here, so a chip without an entry has nothing to show.
   */
  readonly byMemberNo: ReadonlyMap<string, PersonCare>
  /**
   * Whether the records could not be read, so the screen can say that nobody's care is
   * shown rather than let an empty map read as a unit with no needs.
   */
  readonly isUnknown: boolean
}

/**
 * The care every person in the leader's own unit needs, read from their records in full.
 * @returns The care by member number, and whether it could be read.
 */
export function useUnitCare(): UnitCare {
  const viewer = useViewer()
  const { data, error } = useQuery(fetchUnitDetailsQuery(viewer, viewer.unitNumber))
  const byMemberNo = useMemo(() => {
    const cares = new Map<string, PersonCare>()
    const people = data ?? []
    for (const person of people) {
      const care = careOf(person.health, person.notes)
      if (care.needs.length > 0) {
        cares.set(person.memberNo, { care, person })
      }
    }
    return cares
  }, [data])
  return { byMemberNo, isUnknown: error !== null && data === undefined }
}
