import { Callout, ChatIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { audienceName, type Note } from "../../../model/Note"

/**
 * The catch-all notes, each a callout titled by who the question named.
 */
export interface NoteCalloutsProps {
  /**
   * What the person wrote.
   */
  readonly notes: readonly Note[]
}

/**
 * What a person wrote in the catch-all questions, each as a callout.
 * @param props The notes.
 * @returns The callouts.
 */
export function NoteCallouts(props: NoteCalloutsProps): ReactElement {
  return (
    <>
      {props.notes.map((note) => (
        <Callout key={note.audience} icon={<ChatIcon />} title={audienceName(note.audience)}>
          <q>{note.text}</q>
        </Callout>
      ))}
    </>
  )
}
