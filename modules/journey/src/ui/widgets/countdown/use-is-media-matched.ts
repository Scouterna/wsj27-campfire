import { useCallback, useSyncExternalStore } from "react"

/**
 * Whether a media query holds, followed live – a window is resized and a setting is
 * changed while the application is open.
 * @param query The media query, as CSS writes it.
 * @returns True while the query matches.
 */
export function useIsMediaMatched(query: string): boolean {
  // Held stable per query: a new subscribe function makes React resubscribe, and the
  // widget renders once a second.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = matchMedia(query)
      media.addEventListener("change", onChange)
      return () => {
        media.removeEventListener("change", onChange)
      }
    },
    [query],
  )

  return useSyncExternalStore(subscribe, () => matchMedia(query).matches)
}
