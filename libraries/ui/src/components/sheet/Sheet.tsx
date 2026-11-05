import { useCallback, useId, useRef, type ReactElement, type ReactNode } from "react"

import { CloseIcon } from "../../foundations/icons/set/CloseIcon"
import { IconButton } from "../iconbutton/IconButton"

import "./Sheet.css"

/**
 * What a sheet is called, what it holds, whether it is open, and how it is left.
 */
export interface SheetProps {
  /**
   * What the sheet holds, scrolled under the heading when it runs long.
   */
  readonly children: ReactNode
  /**
   * A quiet line under the title, which also describes the dialog to a screen reader.
   */
  readonly description?: string | undefined
  /**
   * What stays in reach under the content however far it is scrolled, such as a way
   * onward.
   */
  readonly footer?: ReactNode
  /**
   * Whether the sheet is showing.
   */
  readonly isOpen: boolean
  /**
   * The tile beside the title – an avatar, a mark.
   */
  readonly leading?: ReactNode
  /**
   * What leaving does – the close button, Escape, or a press on the backdrop. The sheet
   * does not close itself; the caller closes it.
   */
  readonly onClose: () => void
  /**
   * The sheet's heading, which also names the dialog.
   */
  readonly title: string
}

/**
 * Something to read over the page without leaving it: a heading that stays put, content
 * that scrolls under it, and a way out – a bottom sheet on a phone and a centered panel
 * on a wide screen. The platform's modal dialog, so the page behind is out of reach,
 * focus starts on the title, so a screen reader hears what opened and no control looks
 * pressed before anything is, and it goes back to what opened the sheet once it closes –
 * where that is still in the document.
 *
 * Keep it mounted in something that outlives its opener where the opener can be taken
 * away, such as a virtualized row, because the sheet goes with its parent.
 * @param props The heading, the content, and what leaving does.
 * @returns The dialog, shown while `isOpen`.
 */
export function Sheet(props: SheetProps): ReactElement | null {
  const id = useId()
  const { description, footer, leading, onClose } = props

  // What held focus as the sheet opened, read only as it first shows, because a ref
  // attached again while it is open would find focus already inside it.
  const opener = useRef<Element | undefined>(undefined)

  // Shown as a modal the moment it mounts, and taken away rather than closed, which the
  // platform does not follow by handing focus back, so focus goes back by hand.
  const showOnMount = useCallback((node: HTMLDialogElement | null): (() => void) | undefined => {
    if (node === null) {
      return undefined
    }
    if (!node.open) {
      opener.current = document.activeElement ?? undefined
      node.showModal()
      // The platform would focus the close button, which then shows its ring as if it were
      // about to be pressed.
      node.querySelector<HTMLElement>(".sheet-title")?.focus()
    }
    return () => {
      // Closed first, since the page behind a modal is inert and takes no focus.
      if (node.open) {
        node.close()
      }
      const { current } = opener
      if (current instanceof HTMLElement && current.isConnected) {
        current.focus()
      }
    }
  }, [])

  if (!props.isOpen) {
    return null
  }

  return (
    <dialog
      aria-labelledby={`${id}-title`}
      className="sheet"
      onCancel={(event) => {
        // Escape closes the platform's dialog on its own; the caller decides instead.
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A press on the backdrop lands on the dialog itself, never on its content.
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      ref={showOnMount}
      {...(description !== undefined && { "aria-describedby": `${id}-description` })}
    >
      <header className="sheet-header">
        {leading === undefined ? null : <div className="sheet-leading">{leading}</div>}
        <div className="sheet-heading">
          <h2 className="sheet-title" id={`${id}-title`} tabIndex={-1}>
            {props.title}
          </h2>
          {description === undefined ? null : (
            <p className="sheet-description" id={`${id}-description`}>
              {description}
            </p>
          )}
        </div>
        <IconButton
          icon={<CloseIcon size={20} strokeWidth={2.2} />}
          label="Stäng"
          onPress={onClose}
          variant="glass"
        />
      </header>
      {/* In the tab order, so a keyboard can scroll content that holds no control. */}
      <div aria-labelledby={`${id}-title`} className="sheet-body" role="region" tabIndex={0}>
        {props.children}
      </div>
      {footer === undefined ? null : <footer className="sheet-footer">{footer}</footer>}
    </dialog>
  )
}
