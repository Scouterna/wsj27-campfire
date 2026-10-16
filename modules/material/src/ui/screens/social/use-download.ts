import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react"

import { encode, fileNameFor } from "../../../model/social/compose"
import type { Frame } from "../../../model/social/Frame"

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
  /**
   * Whether the canvas is being encoded.
   */
  readonly isSaving: boolean
}

/**
 * Saves a drawn canvas as a PNG named after its frame, or as the picture with none.
 *
 * The download keeps one identity for as long as the canvas does, because it is the
 * page's action and the page declares its actions again whenever one changes.
 * @param canvas the canvas the finished image is drawn on
 * @param frame the frame it was made with, or undefined for none
 * @returns The download, and how it is going.
 */
export function useDownload(
  canvas: RefObject<HTMLCanvasElement | null>,
  frame: Frame | undefined,
): Download {
  const [isSaving, setIsSaving] = useState(false)
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
    setIsSaving(true)
    setHasFailed(false)

    async function save(target: HTMLCanvasElement, named: Frame | undefined): Promise<void> {
      try {
        const url = URL.createObjectURL(await encode(target))
        const link = document.createElement("a")
        link.download = fileNameFor(named)
        link.href = url
        link.click()
        // The download has the bytes by now; the address is only the handle it was
        // fetched through.
        URL.revokeObjectURL(url)
      } catch {
        setHasFailed(true)
      } finally {
        setIsSaving(false)
      }
    }

    void save(drawn, latest.current)
  }, [canvas])

  return { download, hasFailed, isSaving }
}
