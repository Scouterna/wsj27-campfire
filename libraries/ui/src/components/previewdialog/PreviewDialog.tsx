import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"

import { setNavDirection } from "../../behavior/transitions"
import { CloseIcon } from "../../foundations/icons/set/CloseIcon"

import "./PreviewDialog.css"

export interface PreviewDialogProps {
  /**
   * The actions under the picture, such as the downloads.
   */
  readonly children?: ReactNode
  /**
   * A quiet line under the title – a type and a size, or where the thing comes from.
   */
  readonly description?: string | undefined
  /**
   * The picture's address, asked for only once the dialog opens.
   */
  readonly image: string
  /**
   * Called once the dialog has closed – by its button, by Escape, or by a press outside
   * it. The owner unmounts the dialog in answer, because a mounted dialog is an open one.
   */
  readonly onClose: () => void
  /**
   * The element the preview grows out of as the dialog opens and shrinks back into as it
   * closes – the thumbnail that was pressed. Without it the dialog fades in and out.
   */
  readonly origin?: RefObject<HTMLElement | null>
  /**
   * What the frame says where neither the picture nor the thumbnail loads, such as the
   * type.
   */
  readonly placeholder: string
  /**
   * A smaller picture of the same thing already on the page, shown until the image has
   * loaded and in its place where it does not, so the frame is never empty and the
   * picture has something to grow into.
   */
  readonly thumbnail?: string | undefined
  /**
   * What is being previewed, which also names the dialog and is the picture's
   * alternative text.
   */
  readonly title: string
  /**
   * The backdrop the picture was drawn for, so a white picture is not lost on white.
   */
  readonly tone: "dark" | "light"
}

/**
 * The name the preview carries through a transition, worn by the origin on one side and
 * by the dialog's sheet on the other, never both in the same state.
 */
const previewName = "preview"

/**
 * Runs a change to the page as a view transition with the origin wearing the preview's
 * name on the side where it stands for the preview, or as a plain change where the
 * browser has no view transitions or the reader asked for reduced motion.
 * @param origin The element the picture grows out of, if there is one.
 * @param isOpening Whether the dialog is opening, so the origin is the picture before
 * the change rather than after it.
 * @param change The change to the page.
 * @returns Nothing, once the transition has finished and the origin is unnamed again.
 */
async function transition(
  origin: HTMLElement | null | undefined,
  isOpening: boolean,
  change: () => void,
): Promise<void> {
  if (
    typeof document.startViewTransition !== "function" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    change()
    return
  }
  // The page and the chrome take part in every view transition, and their slide follows
  // the last navigation's direction, so this one disarms it – the page stays put.
  setNavDirection("none")
  const name = (isNamed: boolean): void => {
    if (origin !== null && origin !== undefined) {
      origin.style.viewTransitionName = isNamed ? previewName : ""
    }
  }
  name(isOpening)
  // Which way it runs, for the stylesheet to swap the thumbnail and the sheet at the
  // small end.
  const root = document.documentElement
  root.dataset["preview"] = isOpening ? "opening" : "closing"
  const running = document.startViewTransition(() => {
    change()
    name(!isOpening)
  })
  try {
    await running.finished
  } finally {
    name(false)
    delete root.dataset["preview"]
  }
}

/**
 * A modal look at one picture, larger than the page shows it, with its title and the
 * owner's actions under it. The whole sheet grows out of the thumbnail that opened it and
 * shrinks back into it, while the page dims behind.
 *
 * Mounting it opens it as a modal dialog, which keeps focus inside and returns it to
 * where it was when it closes.
 *
 * @param props The picture, what it is, where it grows from, and the actions under it.
 * @returns The dialog.
 */
export function PreviewDialog(props: PreviewDialogProps): ReactElement {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const hasOpenedRef = useRef(false)
  const titleId = useId()
  const { onClose, origin } = props

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) {
      return
    }
    // Opened once per mount. An effect that runs twice – as development's strict mode
    // runs every effect – would start a second transition that skips the first, whose
    // skipped update opens the dialog before the second takes its picture of the page,
    // so the picture would have nothing to grow from.
    if (!hasOpenedRef.current) {
      hasOpenedRef.current = true
      void transition(origin?.current, true, () => {
        dialog.showModal()
        // Focus starts on the way out rather than on the first download, so opening a
        // preview never puts a download one key press away by surprise.
        closeRef.current?.focus()
      })
    }
    // Every way out ends in the dialog's own close, so the browser puts focus back
    // before the owner unmounts it.
    dialog.addEventListener("close", onClose)
    return () => {
      dialog.removeEventListener("close", onClose)
    }
  }, [onClose, origin])

  const close = (): void => {
    const dialog = ref.current
    if (dialog === null) {
      return
    }
    void transition(origin?.current, false, () => {
      dialog.close()
    })
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className={`preview-dialog preview-dialog-${props.tone}`}
      onCancel={(event) => {
        // Escape closes through the same transition as the button.
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        // The dialog is the dimmed screen around the sheet, so a click on the dialog
        // itself is a press outside the sheet.
        if (event.target === event.currentTarget) {
          close()
        }
      }}
      ref={ref}
    >
      <div className="preview-dialog-sheet">
        <PreviewPicture
          image={props.image}
          placeholder={props.placeholder}
          thumbnail={props.thumbnail}
          title={props.title}
        />
        <div className="preview-dialog-caption">
          <h2 className="preview-dialog-title" id={titleId}>
            {props.title}
          </h2>
          {props.description === undefined || props.description === "" ? null : (
            <p className="preview-dialog-description">{props.description}</p>
          )}
          {props.children === undefined ? null : (
            <div className="preview-dialog-actions">{props.children}</div>
          )}
        </div>
        <button
          aria-label="Stäng"
          className="preview-dialog-close"
          onClick={close}
          ref={closeRef}
          type="button"
        >
          <CloseIcon size={20} />
        </button>
      </div>
    </dialog>
  )
}

export interface PreviewPictureProps {
  /**
   * The picture's address.
   */
  readonly image: string
  /**
   * What the frame says where there is no picture to show.
   */
  readonly placeholder: string
  /**
   * A smaller picture of the same thing, shown until the image has loaded and in its
   * place where it does not.
   */
  readonly thumbnail?: string | undefined
  /**
   * The picture's alternative text.
   */
  readonly title: string
}

/**
 * The preview's frame: the thumbnail until the picture has loaded over it, the thumbnail
 * alone where the picture does not load, or the placeholder where there is neither.
 * @param props The pictures, and what to say in their place.
 * @returns The frame.
 */
function PreviewPicture(props: PreviewPictureProps): ReactElement {
  const [hasFailed, setHasFailed] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  if (hasFailed) {
    return (
      <div className="preview-dialog-frame">
        {props.thumbnail === undefined ? (
          <span aria-label={props.title} className="preview-dialog-placeholder" role="img">
            {props.placeholder}
          </span>
        ) : (
          <img alt={props.title} className="preview-dialog-image" src={props.thumbnail} />
        )}
      </div>
    )
  }

  const isWaiting = props.thumbnail !== undefined && !hasLoaded
  return (
    <div className="preview-dialog-frame">
      {isWaiting ? <img alt="" className="preview-dialog-image" src={props.thumbnail} /> : null}
      <img
        alt={props.title}
        className={
          isWaiting ? "preview-dialog-image preview-dialog-image-loading" : "preview-dialog-image"
        }
        onError={() => {
          setHasFailed(true)
        }}
        onLoad={() => {
          setHasLoaded(true)
        }}
        src={props.image}
      />
    </div>
  )
}
