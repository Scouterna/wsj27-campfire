import { useCallback, useEffect, useState, type ChangeEvent } from "react"

import { coverRect } from "../../../model/social/cover"
import { exportSize } from "../../../model/social/Frame"

/**
 * The photo, and the states around choosing one.
 */
export interface PhotoView {
  /**
   * Why the last photo could not be read, or undefined when nothing went wrong. A file
   * that is not an image the browser can decode is the ordinary case – a HEIC on a
   * desktop browser, say.
   */
  readonly error: string | undefined
  /**
   * Whether a photo is being decoded. A large photo off a phone takes a moment.
   */
  readonly isReading: boolean
  /**
   * The photo, decoded, or undefined until one is chosen.
   */
  readonly photo: ImageBitmap | undefined
  /**
   * Reads the file the reader picked in a file input.
   */
  readonly onInput: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * The photo the screen is working with, decoded once and kept until it is replaced.
 *
 * It is shrunk on the way in to the least that still covers a finished image, because
 * every frame redraws it on each key the reader presses and a phone's photo is many times
 * the size of anything this screen draws.
 * @returns The photo, and the states around choosing one.
 */
export function usePhoto(): PhotoView {
  const [photo, setPhoto] = useState<ImageBitmap>()
  const [error, setError] = useState<string>()
  const [isReading, setIsReading] = useState(false)

  // A bitmap holds its pixels until it is closed, so a reader trying five photos does
  // not keep five – one is let go when it is replaced, and the last when the screen goes.
  useEffect(
    () => () => {
      photo?.close()
    },
    [photo],
  )

  const read = useCallback((file: File): void => {
    setIsReading(true)
    setError(undefined)

    async function decode(): Promise<void> {
      try {
        // `from-image` so a photo taken sideways is drawn the way it was taken: a phone
        // records the rotation as metadata rather than rotating the pixels.
        const original = await createImageBitmap(file, { imageOrientation: "from-image" })
        const cover = coverRect(original, exportSize)
        const shrunk =
          cover.width >= original.width
            ? original
            : await createImageBitmap(original, {
                resizeHeight: Math.round(cover.height),
                resizeQuality: "high",
                resizeWidth: Math.round(cover.width),
              })
        if (shrunk !== original) {
          original.close()
        }
        setPhoto(shrunk)
      } catch {
        setError("Bilden kunde inte läsas. Prova en annan, eller en JPEG eller PNG.")
      } finally {
        setIsReading(false)
      }
    }

    void decode()
  }, [])

  const onInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0]
      if (file !== undefined) {
        read(file)
      }
      // Cleared so picking the same file twice in a row still counts as a change.
      event.target.value = ""
    },
    [read],
  )

  return { error, isReading, onInput, photo }
}
