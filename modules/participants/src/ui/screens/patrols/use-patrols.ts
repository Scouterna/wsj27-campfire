import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useRef, useState } from "react"

import { fetchParticipantQuery } from "../../../data/fetch-participant"
import { fetchParticipantsQuery } from "../../../data/fetch-participants"
import { savePatrols, type PatrolSave } from "../../../data/save-patrols"
import { useViewer } from "../../../data/viewer"
import type { Participant } from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import type { ParticipantsList } from "../../../model/ParticipantsList"
import {
  draftOf,
  patrolNames,
  patrolWrites,
  rebased,
  withPatrols,
  type PatrolDraft,
  type PatrolWrite,
} from "../../../model/Patrol"

/**
 * What the editor last said to a screen reader, kept with a count so two sayings in the
 * same words can be told apart.
 */
export interface PatrolSpoken {
  /**
   * Which saying this was, counted up.
   */
  readonly serial: number
  /**
   * The words, empty once they are out of date.
   */
  readonly words: string
}

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
   * What the last save came to, until the draft changes again. A save that stored
   * everything does not stand while changes made during it are still to save, nor once
   * something else is said.
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
   * Says what just happened to a screen reader. Made after `update` or `reset`, which
   * silence whatever was said before.
   */
  readonly say: (words: string) => void
  /**
   * What was last said, until a later change or a finished save overtakes it. A failed
   * save overtakes it too, because the words go with the arrangement it did not store.
   */
  readonly spoken: PatrolSpoken
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
 * A leader's changes, beside the people they were made against, so that what arrives
 * later can be told from what they did.
 */
interface Edited {
  /**
   * The arrangement as the leader last left it.
   */
  readonly draft: PatrolDraft
  /**
   * The people as the service had sent them then.
   */
  readonly from: readonly Participant[]
}

/**
 * One save: what it writes, and what the screen stood at when it was asked for.
 */
interface PatrolSaveRequest {
  /**
   * The changes it stores, so a change made while it ran can be told from them.
   */
  readonly edited: Edited | undefined
  /**
   * The patrols' names by place, which the arrangement keeps once it is stored.
   */
  readonly places: readonly string[]
  /**
   * What had been said, so something said while it ran can be told from it.
   */
  readonly spoken: PatrolSpoken
  /**
   * The writes.
   */
  readonly writes: readonly PatrolWrite[]
}

/**
 * What a save stored, kept beside the list it was saved over. The cached list is updated
 * at once, but the screen hears of it a tick later, so until then the stored patrols are
 * laid over what it still shows.
 */
interface Stored {
  /**
   * The people as the screen had them when the save answered.
   */
  readonly over: readonly Participant[]
  /**
   * The writes the service took.
   */
  readonly saved: readonly PatrolWrite[]
}

/**
 * The same saying with its words taken away, which keeps its count running.
 * @param spoken The saying.
 * @returns The silent saying.
 */
function silenced(spoken: PatrolSpoken): PatrolSpoken {
  return spoken.words === "" ? spoken : { ...spoken, words: "" }
}

/**
 * The patrol editor's state: a draft that starts from the unit's stored patrols and keeps
 * the leader's changes apart from them until they save. What arrives meanwhile is laid
 * under those changes, so nothing somebody else stored is written back.
 *
 * Nothing shows before the service has answered. What it took then goes into the cached
 * list, because a read straight afterward may not get through on the island, and every
 * query of the module is marked stale. A save with no failures ends the editing, and one
 * with failures keeps the draft, so a write that failed stays a change still to save.
 * @param people The unit's people, as the service last sent them.
 * @returns The draft, what it would write, and the actions on it.
 */
export function usePatrols(people: readonly Participant[]): PatrolsEditor {
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const [edited, setEdited] = useState<Edited | undefined>(undefined)
  const [lastSave, setLastSave] = useState<PatrolSave | undefined>(undefined)
  const [places, setPlaces] = useState<readonly string[]>([])
  const [spoken, setSpoken] = useState<PatrolSpoken>({ serial: 0, words: "" })
  const [stored, setStored] = useState<Stored | undefined>(undefined)

  // Without it, the render that ends the editing would build the draft from the list
  // before the save, and the people just saved would show in their old patrols for a
  // moment.
  const shown = useMemo(
    () => (stored?.over === people ? withPatrols(people, stored.saved) : people),
    [people, stored],
  )

  // The stored arrangement until the leader touches it, so a list that arrives or changes
  // while nothing is edited is what the screen shows.
  const draft = useMemo(
    () =>
      edited === undefined ? draftOf(shown, places) : rebased(edited.draft, edited.from, shown),
    [edited, places, shown],
  )
  const writes = useMemo(() => patrolWrites(shown, draft), [draft, shown])

  const { isPending, mutate } = useMutation({
    mutationFn: async (request: PatrolSaveRequest) => savePatrols(request.writes),
    // Sent whatever the webview guesses about the connection, because a guess of offline
    // would pause the save with nothing to say, where a real failure lands in `failed`.
    networkMode: "always",
    onSuccess: (result, request) => {
      setLastSave(result)
      setStored((before) => ({
        over: people,
        saved: before?.over === people ? [...before.saved, ...result.saved] : result.saved,
      }))
      const list = fetchParticipantsQuery(viewer).queryKey
      queryClient.setQueryData<ParticipantsList>(list, (current) =>
        current === undefined
          ? current
          : { ...current, people: withPatrols(current.people, result.saved) },
      )
      // Each saved scout's own record too, or their page says the old patrol for as long
      // as the read the invalidation starts cannot get through.
      for (const write of result.saved) {
        queryClient.setQueryData<ParticipantDetail>(
          fetchParticipantQuery(write.memberNo, viewer).queryKey,
          (current) => (current === undefined ? current : withPatrols([current], [write])[0]),
        )
      }
      if (result.failed.length === 0) {
        setPlaces(request.places)
        // Only the changes this save stored – any made while it ran are still to save.
        setEdited((current) => (current === request.edited ? undefined : current))
      }
      setSpoken((current) => (current === request.spoken ? silenced(current) : current))
      // Left to run on its own, because the mutation stays pending until this callback
      // settles, and a read can pause for as long as the connection is gone.
      void queryClient.invalidateQueries({ queryKey: ["participants"] })
    },
  })

  const reset = useCallback(() => {
    setEdited(undefined)
    setLastSave(undefined)
    setSpoken(silenced)
  }, [])

  // Set at the press rather than read from `isPending`, which a second press before the
  // next render would still see as idle.
  const saving = useRef(false)
  const save = useCallback(() => {
    if (saving.current || writes.length === 0) {
      return
    }
    saving.current = true
    mutate(
      { edited, places: patrolNames(draft), spoken, writes },
      {
        onSettled: () => {
          saving.current = false
        },
      },
    )
  }, [draft, edited, mutate, spoken, writes])

  const say = useCallback((words: string) => {
    // Only a confirmation gives way, because a failure still has people to name.
    setLastSave((current) => (current?.failed.length === 0 ? undefined : current))
    setSpoken((current) => ({ serial: current.serial + 1, words }))
  }, [])

  const update = useCallback(
    (next: PatrolDraft) => {
      setEdited({ draft: next, from: shown })
      setLastSave(undefined)
      setSpoken(silenced)
    },
    [shown],
  )

  const isOvertaken = lastSave?.failed.length === 0 && writes.length > 0

  return useMemo(
    () => ({
      draft,
      isSaving: isPending,
      lastSave: isOvertaken ? undefined : lastSave,
      reset,
      save,
      say,
      spoken,
      update,
      writes,
    }),
    [draft, isOvertaken, isPending, lastSave, reset, save, say, spoken, update, writes],
  )
}
