import { PreviewDialog } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useRef, useState, type ReactElement, type ReactNode } from "react"

import "./MaterialTile.css"

/**
 * What a tile's picture sits on. A white symbol on a white sheet is an empty square, so
 * the tone the picture was drawn for decides its backdrop.
 */
export type TileTone = "dark" | "light"

export interface MaterialTileProps {
  /**
   * The controls under the name and under the preview – the formats the file can be
   * downloaded in.
   */
  readonly children?: ReactNode
  /**
   * The name under the picture, which is also the picture's alternative text.
   */
  readonly label: string
  /**
   * The quiet line under the name – a type and a size, or the folder it came from.
   */
  readonly meta?: string | undefined
  /**
   * The large picture the preview shows.
   */
  readonly picture: string
  /**
   * What the frame says in place of a picture that is missing or does not load – the
   * file's type, such as "PDF".
   */
  readonly placeholder: string
  /**
   * The small picture the tile shows.
   */
  readonly thumbnail: string
  /**
   * The backdrop to draw the picture on.
   */
  readonly tone: TileTone
  /**
   * Where the file can be read in full, offered in the preview for a document whose
   * picture shows only its first page.
   */
  readonly viewerUrl?: string | undefined
}

/**
 * One piece of material as a tile: its picture in a square frame, its name and a quiet
 * line under that, and the caller's controls below. A press on the picture grows it into
 * a larger preview with the same controls, so a reader sees a file before they take it
 * without leaving Campfire.
 *
 * @param props The pictures, the name, and the controls under it.
 * @returns The tile.
 */
export function MaterialTile(props: MaterialTileProps): ReactElement {
  // Offline, or for a file Drive cannot draw, the picture fails, and a frame showing the
  // browser's broken-image mark reads as a fault rather than as a file.
  const [failedPicture, setFailedPicture] = useState<string>()
  const [isPreviewing, setIsPreviewing] = useState(false)
  const frameRef = useRef<HTMLButtonElement>(null)
  const hasPicture = failedPicture !== props.thumbnail
  const closePreview = useCallback(() => {
    setIsPreviewing(false)
  }, [])

  return (
    <figure className={`tile tile-${props.tone}`}>
      <button
        aria-haspopup="dialog"
        className="tile-frame"
        ref={frameRef}
        onClick={() => {
          setIsPreviewing(true)
        }}
        type="button"
      >
        {hasPicture ? (
          <img
            alt={props.label}
            className="tile-image"
            loading="lazy"
            onError={() => {
              setFailedPicture(props.thumbnail)
            }}
            src={props.thumbnail}
          />
        ) : (
          <span aria-label={props.label} className="tile-placeholder" role="img">
            {props.placeholder}
          </span>
        )}
      </button>
      <figcaption className="tile-caption">
        <strong className="tile-label">{props.label}</strong>
        {props.meta === undefined || props.meta === "" ? null : (
          <small className="tile-meta">{props.meta}</small>
        )}
        {props.children === undefined ? null : (
          <span className="tile-actions">{props.children}</span>
        )}
      </figcaption>
      {isPreviewing ? (
        <PreviewDialog
          description={props.meta}
          image={props.picture}
          onClose={closePreview}
          origin={frameRef}
          placeholder={props.placeholder}
          thumbnail={hasPicture ? props.thumbnail : undefined}
          title={props.label}
          tone={props.tone}
        >
          {props.children}
          {props.viewerUrl === undefined ? null : (
            <a className="tile-viewer" href={props.viewerUrl} rel="noreferrer" target="_blank">
              Öppna i Google Drive
            </a>
          )}
        </PreviewDialog>
      ) : null}
    </figure>
  )
}
