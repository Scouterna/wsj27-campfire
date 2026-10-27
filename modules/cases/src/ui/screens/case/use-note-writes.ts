import { useMutation } from "@tanstack/react-query"
import { useCallback } from "react"

import { addNote, attachPicture } from "../../../data/mutations"
import type { SecrecyLevel } from "../../../model/SecrecyLevel"
import { shrinkPicture } from "./shrink-picture"

/**
 * Where one picture of a note is on its way – being sent, arrived, or failed.
 */
export type PictureState = "failed" | "sending" | "sent"

/**
 * A note as it is written: what it says, under which heading, at which level, and the
 * pictures to attach to it.
 */
export interface NoteDraft {
  /**
   * A level above the case's, for a note some who reach the case should not read, or
   * undefined for the case's own.
   */
  readonly level: SecrecyLevel | undefined
  /**
   * The pictures, as they were chosen.
   */
  readonly pictures: readonly File[]
  /**
   * What the note says.
   */
  readonly text: string
  /**
   * The heading the note is written under.
   */
  readonly title: string
}

/**
 * How a screen follows a note's pictures on their way.
 */
export interface PictureProgress {
  /**
   * Called as each picture sets off and as it settles, by its place among the pictures.
   */
  readonly onPicture: (index: number, state: PictureState) => void
  /**
   * Called once every picture has settled, with the note they belong to and the places of
   * those that did not arrive, so the screen can offer to send them again.
   */
  readonly onSettled: (noteId: string, failed: readonly number[]) => void
}

/**
 * Sends a note's pictures one after another, each shrunk first. One at a time, because on
 * a slow network parallel uploads only share the same bandwidth, and the first picture
 * arrives sooner alone.
 * @param caseId The case the note is on.
 * @param noteId The note the pictures go on.
 * @param pictures The pictures, as they were chosen.
 * @param onPicture Told as each picture sets off and settles.
 * @returns The places of the pictures that did not arrive.
 */
async function sendPictures(
  caseId: string,
  noteId: string,
  pictures: readonly File[],
  onPicture: PictureProgress["onPicture"],
): Promise<readonly number[]> {
  const failed: number[] = []
  for (const [index, picture] of pictures.entries()) {
    onPicture(index, "sending")
    try {
      await attachPicture(caseId, noteId, await shrinkPicture(picture))
      onPicture(index, "sent")
    } catch {
      onPicture(index, "failed")
      failed.push(index)
    }
  }
  return failed
}

/**
 * Writing a note and sending its pictures, and how that is going.
 */
export interface NoteWrites {
  /**
   * Writes a note on the case, then sends its pictures, telling the screen how each one
   * goes. A note that cannot be written sends none and reports the failure instead.
   */
  readonly addNote: (draft: NoteDraft, progress: PictureProgress) => void
  /**
   * Sends pictures to a note already written – those that did not arrive the first time.
   */
  readonly attachPictures: (
    noteId: string,
    pictures: readonly File[],
    progress: PictureProgress,
  ) => void
  /**
   * Whether a note or its pictures are on their way.
   */
  readonly isBusy: boolean
}

/**
 * The case screen's note writes – a note and its pictures, or pictures again to a note
 * already written – each followed by one fresh read of the case and its notes once the
 * pictures have settled, because the service logs every read of the notes.
 * @param caseId The case to write on.
 * @param refresh Reads the case and its notes again.
 * @param setFailure Says what went wrong, in the reader's words, or clears it.
 * @returns The writes, and how they are going.
 */
export function useNoteWrites(
  caseId: string,
  refresh: () => Promise<void>,
  setFailure: (failure: string | undefined) => void,
): NoteWrites {
  const adding = useMutation({
    mutationFn: async ({ draft, progress }: { draft: NoteDraft; progress: PictureProgress }) => {
      const note = await addNote(caseId, draft.text, draft.title, draft.level)
      const failed = await sendPictures(caseId, note.id, draft.pictures, progress.onPicture)
      return { failed, noteId: note.id }
    },
    onSettled: refresh,
  })
  const attaching = useMutation({
    mutationFn: async (input: {
      noteId: string
      pictures: readonly File[]
      progress: PictureProgress
    }) => {
      const failed = await sendPictures(
        caseId,
        input.noteId,
        input.pictures,
        input.progress.onPicture,
      )
      return { failed, noteId: input.noteId }
    },
    onSettled: refresh,
  })

  const { mutate: add } = adding
  const { mutate: attach } = attaching

  const writeNote = useCallback(
    (draft: NoteDraft, progress: PictureProgress): void => {
      setFailure(undefined)
      add(
        { draft, progress },
        {
          onError: () => {
            setFailure("Anteckningen kunde inte sparas.")
          },
          onSuccess: ({ failed, noteId }) => {
            progress.onSettled(noteId, failed)
          },
        },
      )
    },
    [add, setFailure],
  )
  const attachTo = useCallback(
    (noteId: string, pictures: readonly File[], progress: PictureProgress): void => {
      setFailure(undefined)
      attach(
        { noteId, pictures, progress },
        {
          onSuccess: (sent) => {
            progress.onSettled(sent.noteId, sent.failed)
          },
        },
      )
    },
    [attach, setFailure],
  )

  return {
    addNote: writeNote,
    attachPictures: attachTo,
    isBusy: adding.isPending || attaching.isPending,
  }
}
