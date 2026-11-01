import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react"

import type { Frame } from "../../../model/social/Frame"
import { encode, fileNameFor } from "./compose"

/**
 * A download of a drawn canvas, and how it is going.
 */
export interface Download {
  /**
   * Saves the canvas as it is now to the reader's device.
   */
  readonly download: () => void
  /**
   * Whether the last download failed, which means the browser would not encode it.
   */
  readonly hasFailed: boolean
}

/**
 * How long a finished image's address stays valid, in milliseconds. A click on a link only
 * asks for the download, and Safari fails one whose address is revoked before it has read
 * the bytes.
 */
const addressLifetime = 60_000

/**
 * Saves a drawn canvas as a PNG named after its frame, or as the picture with none.
 *
 * The download keeps one identity for as long as the canvas does, because it is the
 * page's action and the page declares its actions again whenever one changes.
 * @param canvas the canvas the finished image is drawn on
 * @param frame the frame it was made with, or undefined for none
 * @returns The download, and whether the last one failed.
 */
export function useDownload(
  canvas: RefObject<HTMLCanvasElement | null>,
  frame: Frame | undefined,
): Download {
  const [hasFailed, setHasFailed] = useState(false)
  const latest = useRef(frame)
  useLayoutEffect(() => {
    latest.current = frame
  })

  const download = useCallback((): void => {
    const drawn = canvas.current
    if (drawn === null) {
      return
    }
    setHasFailed(false)

    async function save(target: HTMLCanvasElement, named: Frame | undefined): Promise<void> {
      try {
        const url = URL.createObjectURL(await encode(target))
        const link = document.createElement("a")
        link.download = fileNameFor(named)
        link.href = url
        link.click()
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, addressLifetime)
      } catch {
        setHasFailed(true)
      }
    }

    void save(drawn, latest.current)
  }, [canvas])

  return { download, hasFailed }
}
