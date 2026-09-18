import { useEffect, useState, type RefObject } from "react"

/**
 * Whether an element can actually be seen: inside the viewport, in a document that is
 * itself showing – not a background tab, and not a shell that has been put away.
 * @param element The element to watch.
 * @returns True while the element is on screen. True before the first measurement, so
 * what is drawn first is never held back.
 */
export function useIsOnScreen(element: RefObject<Element | null>): boolean {
  const [isInView, setIsInView] = useState(true)
  const [isShowing, setIsShowing] = useState(() => document.visibilityState === "visible")

  useEffect(() => {
    const target = element.current
    if (target === null) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      setIsInView(entries.at(-1)?.isIntersecting ?? true)
    })
    observer.observe(target)

    const onVisibilityChange = (): void => {
      setIsShowing(document.visibilityState === "visible")
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [element])

  return isInView && isShowing
}
