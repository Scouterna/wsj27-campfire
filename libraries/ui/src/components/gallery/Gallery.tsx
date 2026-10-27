import { useCallback, useRef, useState, type ReactElement } from "react"

import { PreviewDialog } from "../previewdialog/PreviewDialog"

import "./Gallery.css"

/**
 * One picture in a gallery, at the two sizes it is kept in.
 */
export interface GalleryPicture {
  /**
   * The picture's height in pixels, which with its width shapes its frame before it loads.
   */
  readonly height: number
  /**
   * The picture in full, asked for only once it is opened.
   */
  readonly image: string
  /**
   * The picture's key, unique in the gallery and stable across renders.
   */
  readonly key: string
  /**
   * The small picture the gallery shows.
   */
  readonly thumbnail: string
  /**
   * What the picture is called, which is also its alternative text.
   */
  readonly title: string
  /**
   * The picture's width in pixels.
   */
  readonly width: number
}

/**
 * The pictures, the list's name, and what a frame says where one does not load.
 */
export interface GalleryProps {
  /**
   * What the pictures are, for assistive technology.
   */
  readonly label: string
  /**
   * What the frame says where a picture does not load.
   */
  readonly placeholder: string
  /**
   * The pictures, in the order they are shown.
   */
  readonly pictures: readonly GalleryPicture[]
}

/**
 * The longest side a lone picture is shown at, in pixels.
 */
const singleSide = 240

interface TileProps {
  /**
   * Whether the picture is the gallery's only one, which shows in its own shape rather
   * than cropped to a square.
   */
  readonly isSingle: boolean
  /**
   * The picture.
   */
  readonly picture: GalleryPicture
  /**
   * What the frame says where the picture does not load.
   */
  readonly placeholder: string
}

/**
 * One picture as a button that opens it, its preview growing out of the tile.
 * @param props The picture, and how it sits in the gallery.
 * @returns The tile, and the preview while it is open.
 */
function Tile(props: TileProps): ReactElement {
  const { picture } = props
  const frameRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  // A picture the session can no longer read, or that never arrived, shows the
  // placeholder rather than the browser's broken-image mark.
  const [hasFailed, setHasFailed] = useState(false)
  const close = useCallback(() => {
    setIsOpen(false)
  }, [])
  // A lone picture's shape is known only from the picture, so its frame is sized here,
  // never larger than the picture itself.
  const scale = Math.min(1, singleSide / Math.max(picture.width, picture.height, 1))
  const shape = props.isSingle
    ? {
        aspectRatio: `${String(picture.width)} / ${String(picture.height)}`,
        width: `${String(Math.round(picture.width * scale))}px`,
      }
    : undefined

  return (
    <li className="gallery-item">
      <button
        aria-haspopup="dialog"
        className="gallery-tile"
        onClick={() => {
          setIsOpen(true)
        }}
        ref={frameRef}
        style={shape}
        type="button"
      >
        {hasFailed ? (
          <span aria-label={picture.title} className="gallery-placeholder" role="img">
            {props.placeholder}
          </span>
        ) : (
          <img
            alt={picture.title}
            className="gallery-image"
            height={picture.height}
            loading="lazy"
            onError={() => {
              setHasFailed(true)
            }}
            src={picture.thumbnail}
            width={picture.width}
          />
        )}
      </button>
      {isOpen ? (
        <PreviewDialog
          image={picture.image}
          onClose={close}
          origin={frameRef}
          placeholder={props.placeholder}
          thumbnail={hasFailed ? undefined : picture.thumbnail}
          title={picture.title}
          tone="light"
        />
      ) : null}
    </li>
  )
}

/**
 * Pictures as tiles, each opening a larger look at it. A single picture shows in its own
 * shape, large enough to read at a glance; several are cropped to squares in a row that
 * wraps, so a handful reads as one set.
 * @param props The pictures, and what the set is.
 * @returns The gallery.
 */
export function Gallery(props: GalleryProps): ReactElement {
  const isSingle = props.pictures.length === 1
  return (
    <ul aria-label={props.label} className="gallery">
      {props.pictures.map((picture) => (
        <Tile
          isSingle={isSingle}
          key={picture.key}
          picture={picture}
          placeholder={props.placeholder}
        />
      ))}
    </ul>
  )
}
