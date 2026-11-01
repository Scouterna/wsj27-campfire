import { useEffect, useState, type RefObject } from "react"

import { drawScene, loadScene, type DrawnText, type Scene } from "./compose"

/**
 * Whether a scene has reached its canvas yet.
 */
export interface DrawnScene {
  /**
   * How each text last came out, by slot id or text id – missing for one left empty.
   */
  readonly drawn: Readonly<Record<string, DrawnText>>
  /**
   * Whether the last draw failed, which means the artwork or the mark could not load.
   */
  readonly hasFailed: boolean
  /**
   * Whether the canvas holds a finished image, so there is something to download.
   */
  readonly isDrawn: boolean
}

/**
 * Keeps a canvas drawn with a scene, redrawing whenever any part of it changes.
 * @param canvas the canvas to draw on
 * @param scene what to draw. A new object is a redraw, so the caller memoizes it.
 * @returns Whether the canvas holds the image, whether drawing it failed, and how the text
 * came out.
 */
export function useDrawnScene(
  canvas: RefObject<HTMLCanvasElement | null>,
  scene: Scene,
): DrawnScene {
  const [isDrawn, setIsDrawn] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const [drawn, setDrawn] = useState<Readonly<Record<string, DrawnText>>>({})

  useEffect(() => {
    // A newer draw can overtake an older one while its pictures load, and the older one
    // must not paint over it when it lands.
    let isCurrent = true

    async function draw(): Promise<void> {
      try {
        const loaded = await loadScene(scene)
        if (!isCurrent || canvas.current === null) {
          return
        }
        setDrawn(drawScene(canvas.current, loaded))
        setIsDrawn(true)
        setHasFailed(false)
      } catch {
        if (isCurrent) {
          setHasFailed(true)
        }
      }
    }

    void draw()
    return () => {
      isCurrent = false
    }
  }, [canvas, scene])

  return { drawn, hasFailed, isDrawn }
}
