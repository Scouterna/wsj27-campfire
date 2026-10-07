import { useCallback, useId, type ReactElement } from "react"

import { Button } from "../button/Button"

import "./ConfirmDialog.css"

export interface ConfirmDialogProps {
  /**
   * The words on the button that goes ahead.
   */
  readonly confirmLabel: string
  /**
   * What going ahead leads to, in a sentence under the question.
   */
  readonly description: string
  /**
   * Whether the dialog is showing.
   */
  readonly isOpen: boolean
  /**
   * What stepping back does – the cancel button, Escape, or a press on the backdrop.
   */
  readonly onCancel: () => void
  /**
   * What going ahead does. The dialog does not close itself; the caller closes it.
   */
  readonly onConfirm: () => void
  /**
   * The question the dialog asks.
   */
  readonly title: string
}

/**
 * A question put before something the reader may not have meant: the question, what
 * going ahead leads to, and a way back as well as a way on. The platform's modal dialog,
 * so focus is held inside it and Escape steps back.
 * @param props The words, and what each way out does.
 * @returns The dialog, shown while `isOpen`.
 */
export function ConfirmDialog(props: ConfirmDialogProps): ReactElement | null {
  const id = useId()
  const { onCancel } = props

  // Shown as a modal the moment it mounts, which is what traps focus and puts the rest
  // of the page out of reach.
  const showOnMount = useCallback((node: HTMLDialogElement | null) => {
    if (node !== null && !node.open) {
      node.showModal()
    }
  }, [])

  if (!props.isOpen) {
    return null
  }

  return (
    <dialog
      aria-describedby={`${id}-description`}
      aria-labelledby={`${id}-title`}
      className="confirm-dialog"
      onCancel={(event) => {
        // Escape closes the platform's dialog on its own; the caller decides instead.
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        // A press on the backdrop lands on the dialog itself, never on its content.
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
      ref={showOnMount}
    >
      <div className="confirm-dialog-body">
        <h2 className="confirm-dialog-title" id={`${id}-title`}>
          {props.title}
        </h2>
        <p className="confirm-dialog-description" id={`${id}-description`}>
          {props.description}
        </p>
        <div className="confirm-dialog-actions">
          {/* The way back comes first, because a modal opens with focus on its first
              control, and the safe answer is the one a stray Enter should give. */}
          <Button label="Avbryt" onPress={onCancel} variant="plain" />
          <Button label={props.confirmLabel} onPress={props.onConfirm} />
        </div>
      </div>
    </dialog>
  )
}
