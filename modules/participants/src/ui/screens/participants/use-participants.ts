import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { fetchParticipantsQuery } from "../../../data/fetch-participants"
import { useViewer, type Viewer } from "../../../data/viewer"
import { inReadingOrder, type Participant } from "../../../model/Participant"
import type { ListScope } from "../../../model/ParticipantsList"

/**
 * What a screen listing people needs: the people, what they are a list of, and the two
 * states that are not a list at all.
 */
export interface ParticipantsView {
  /**
   * Why the list could not be assembled, or null while it can be.
   */
  readonly error: Error | null
  /**
   * Whether the answer is still on its way.
   */
  readonly isPending: boolean
  /**
   * The people the viewer may see, in reading order.
   */
  readonly people: readonly Participant[]
  /**
   * Asks again, for the control a failed screen offers.
   */
  readonly refetch: () => void
  /**
   * What the people are a list of. Answered from the viewer until the list arrives, so
   * the screen can title and shape itself before it has any rows.
   */
  readonly scope: ListScope
}

/**
 * What the viewer's own grants say their list will cover, before any of it has arrived.
 *
 * The same rule the query itself follows, read off the viewer rather than off the
 * answer – which is what lets the title, the search, and the chips be right on the
 * first frame instead of appearing once the network is done.
 * @param viewer Who is reading.
 * @returns The scope their list will have.
 */
function scopeOf(viewer: Viewer): ListScope {
  if (viewer.readsEveryone) {
    return { kind: "all" }
  }
  if (viewer.unitNumber !== undefined) {
    return { kind: "unit", unitNumber: viewer.unitNumber }
  }
  return { kind: "nobody" }
}

/**
 * The list of participants as the viewer may read it, fetched and put in reading order.
 * The screens' whole dependency on the outside world lives here, which is what lets the
 * screens themselves stay pure.
 * @returns The people, the scope, and the states around them.
 */
export function useParticipants(): ParticipantsView {
  const viewer = useViewer()
  const { data, error, isPending, refetch } = useQuery(fetchParticipantsQuery(viewer))

  // Sorting 2,600 people collates 2,600 names, so it happens when the answer changes
  // rather than on every keystroke that re-renders the screen above it.
  const people = useMemo(() => inReadingOrder(data?.people ?? []), [data])

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  return { error, isPending, people, refetch: again, scope: data?.scope ?? scopeOf(viewer) }
}
