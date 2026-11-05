import { useEffect, useRef, useState, type ReactElement } from "react"

import type { PatrolSave } from "../../../data/save-patrols"
import type { PatrolsEditor } from "./use-patrols"

import "./PatrolStatus.css"

/**
 * How long a finished save is held as what the line says, so a later move is not read
 * out as a save.
 */
const savedMs = 5000

/**
 * What the status says: how a save went, and otherwise what the editor last said, which a
 * screen reader hears in place of the boards moving. A save that failed is the warnings'
 * to say.
 * @param editor The draft and its save.
 * @param isSaved Whether a finished save is showing.
 * @returns The words, empty with nothing to say.
 */
function spokenOf(editor: PatrolsEditor, isSaved: boolean): string {
  if (isSaved) {
    return "Patrullerna är sparade."
  }
  if (editor.isSaving) {
    return "Sparar …"
  }
  const { serial, words } = editor.spoken
  if (editor.lastSave?.failed.length === 0 || words === "") {
    return ""
  }
  // A live region is silent on unchanged text, so a second saying in the same words differs
  // by a space nobody sees.
  return serial % 2 === 0 ? words : `${words}\u{A0}`
}

/**
 * What a `PatrolStatus` reports on.
 */
export interface PatrolStatusProps {
  /**
   * The draft and its save.
   */
  readonly editor: PatrolsEditor
}

/**
 * The editor's one status line, spoken and never shown: a move, and how a save went. The
 * Spara button going away is what a sighted reader sees of a save.
 * @param props The save to report on.
 * @returns The line.
 */
export function PatrolStatus(props: PatrolStatusProps): ReactElement {
  const { editor } = props
  const { lastSave } = editor
  const [settled, setSettled] = useState<PatrolSave | undefined>(undefined)
  const isSaved = lastSave?.failed.length === 0 && lastSave !== settled
  const line = useRef<HTMLParagraphElement>(null)

  // A finished save takes the button away with focus on it, which would leave the reader's
  // place on the body. A frame later, because the chrome draws that in a render of its own.
  useEffect(() => {
    if (!isSaved) {
      return
    }
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        line.current?.focus({ preventScroll: true })
      }
    })
    const timer = setTimeout(() => {
      setSettled(lastSave)
    }, savedMs)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [isSaved, lastSave])

  return (
    <p className="patrols-spoken" ref={line} role="status" tabIndex={-1}>
      {spokenOf(editor, isSaved)}
    </p>
  )
}
