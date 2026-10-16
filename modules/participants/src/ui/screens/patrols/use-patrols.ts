import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { fetchParticipantsQuery } from "../../../data/fetch-participants"
import { savePatrols, type PatrolSave } from "../../../data/save-patrols"
import { useViewer } from "../../../data/viewer"
import type { Participant } from "../../../model/Participant"
import type { ParticipantsList } from "../../../model/ParticipantsList"
import {
  draftOf,
  patrolWrites,
  withPatrols,
  type PatrolDraft,
  type PatrolWrite,
} from "../../../model/Patrol"

/**
 * A unit's patrols as its leader is arranging them, and the save that puts them in.
 */
export interface PatrolsEditor {
  /**
   * The arrangement on screen.
   */
  readonly draft: PatrolDraft
  /**
   * Whether a save is on its way.
   */
  readonly isSaving: boolean
  /**
   * What the last save came to, until the draft changes again.
   */
  readonly lastSave: PatrolSave | undefined
  /**
   * Forgets every change since the last save.
   */
  readonly reset: () => void
  /**
   * Stores every change. Does nothing while a save is already on its way.
   */
  readonly save: () => void
  /**
   * Puts a new arrangement on screen – nothing is stored until `save`.
   */
  readonly update: (next: PatrolDraft) => void
  /**
   * What saving would write, which is also how far the draft is from what is stored.
   */
  readonly writes: readonly PatrolWrite[]
}

/**
 * The patrol editor's state: a draft that starts from the unit's stored patrols and keeps
 * the leader's changes apart from them until they save.
 *
 * A save applies what landed to the cached list at once, so every screen shows it before
 * the service is asked again. The draft itself is kept, so a write that failed stays a
 * change still to save rather than disappearing with the ones that landed.
 * @param people The unit's people, as the service last sent them.
 * @returns The draft, what it would write, and the actions on it.
 */
export function usePatrols(people: readonly Participant[]): PatrolsEditor {
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const [edited, setEdited] = useState<PatrolDraft | undefined>(undefined)
  const [lastSave, setLastSave] = useState<PatrolSave | undefined>(undefined)

  // The stored arrangement until the leader touches it, so a list that arrives or changes
  // while nothing is edited is what the screen shows.
  const draft = edited ?? draftOf(people)
  const writes = patrolWrites(people, draft)

  const mutation = useMutation({
    mutationFn: savePatrols,
    onSuccess: async (result) => {
      setLastSave(result)
      const query = fetchParticipantsQuery(viewer)
      queryClient.setQueryData<ParticipantsList>(query.queryKey, (list) =>
        list === undefined ? list : { ...list, people: withPatrols(list.people, result.saved) },
      )
      // Asked again as well, so the list settles on what the service holds.
      await queryClient.invalidateQueries({ queryKey: query.queryKey })
    },
  })

  return {
    draft,
    isSaving: mutation.isPending,
    lastSave,
    reset: () => {
      setEdited(undefined)
      setLastSave(undefined)
    },
    save: () => {
      if (!mutation.isPending && writes.length > 0) {
        mutation.mutate(writes)
      }
    },
    update: (next) => {
      setEdited(next)
      setLastSave(undefined)
    },
    writes,
  }
}
