import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useDeferredValue, useEffect, useRef, useState } from "react"

import { toHandbookSearch } from "./handbook-search"

// How long the typing has to rest before the address catches up.
const settleMs = 300

/**
 * The search field's text and the search it settles into.
 */
export interface SearchText {
  /**
   * Takes the field's keystrokes, immediately.
   */
  readonly onText: (text: string) => void
  /**
   * The settled text to search for – deferred, so a keystroke never waits on the search.
   */
  readonly query: string
  /**
   * What the field shows.
   */
  readonly text: string
}

/**
 * The search, living in the address so it can be returned to – while the field itself
 * stays locally controlled, because a field that waits for a round trip through the
 * router drops keystrokes.
 * @returns The field's text, the settled query, and what a keystroke does.
 */
export function useSearchText(): SearchText {
  const navigate = useNavigate()
  const raw = useRouterState({ select: (state) => state.location.search })
  const inAddress = toHandbookSearch(raw).q ?? ""
  const [text, setText] = useState(inAddress)
  // What this hook last wrote into the address. Only somebody else's change – a history
  // pop – puts the field back in step.
  const written = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (written.current !== inAddress) {
      setText(inAddress)
    }
  }, [inAddress])

  const typed = text.trim()
  useEffect(() => {
    if (typed === inAddress) {
      return
    }
    const timer = setTimeout(() => {
      written.current = typed
      // Replacing, because a search is not somewhere the reader went – and without a
      // view transition, because a keystroke that slides the page reads as leaving.
      void navigate({
        replace: true,
        search: typed === "" ? {} : { q: typed },
        to: "/handbook",
        viewTransition: false,
      })
    }, settleMs)
    return () => {
      clearTimeout(timer)
    }
  }, [inAddress, navigate, typed])

  return { onText: setText, query: useDeferredValue(typed), text }
}
