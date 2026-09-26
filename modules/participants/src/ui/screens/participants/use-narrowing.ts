import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"

import type { RoleFilter } from "../../../model/narrowing"
import { toParticipantsSearch, type ParticipantsSearch } from "./search"

/**
 * How long the typing has to settle before the address is rewritten. Long enough that a
 * word is one navigation rather than one per letter, short enough that letting go of the
 * keyboard and sharing the address gives what is on screen.
 */
const settleMs = 150

/**
 * The narrowing as the screen reads and writes it.
 */
export interface Narrowing {
  /**
   * Takes the search field's keystrokes, immediately.
   */
  readonly onText: (value: string) => void
  /**
   * Picks a participation-role chip, or undefined for "Alla", and takes the address
   * there at once, keeping the search text.
   */
  readonly pickRole: (filter: RoleFilter | undefined) => void
  /**
   * The settled search text to narrow by – deferred, so narrowing thousands of rows
   * never sits between a key press and the letter appearing in the field.
   */
  readonly query: string
  /**
   * The participation role in force, or undefined for "Alla".
   */
  readonly roll: RoleFilter | undefined
  /**
   * What the search field shows – the local text, ahead of the address.
   */
  readonly text: string
}

/**
 * The narrowing state, living in the address so a narrowed list can be shared,
 * bookmarked, and returned to – while the field itself stays locally controlled,
 * because a field that waits for a round trip through the router drops keystrokes.
 * The address catches up once the typing settles.
 * @returns The narrowing, and the ways to change it.
 */
export function useNarrowing(): Narrowing {
  const navigate = useNavigate()
  const raw = useRouterState({ select: (state) => state.location.search })
  const address = useMemo(() => toParticipantsSearch(raw), [raw])
  const roll = address.roll
  const inAddress = address.q ?? ""

  const [text, setText] = useState(inAddress)
  // What this hook last wrote into the address. Its own writes are already what the
  // field holds, so only somebody else's – a history pop, a fresh navigation from the
  // menu – puts the field back in step.
  const written = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (written.current !== inAddress) {
      setText(inAddress)
    }
  }, [inAddress])

  const write = useCallback(
    (next: ParticipantsSearch): void => {
      written.current = next.q ?? ""
      // Replacing, because narrowing is not somewhere the reader went – and without a
      // view transition, because a keystroke that slides the whole page reads as leaving.
      void navigate({ replace: true, search: next, to: "/participants", viewTransition: false })
    },
    [navigate],
  )

  const typed = text.trim()
  useEffect(() => {
    if (typed === inAddress) {
      return
    }
    const timer = setTimeout(() => {
      write({ ...(typed !== "" && { q: typed }), ...(roll !== undefined && { roll }) })
    }, settleMs)
    return () => {
      clearTimeout(timer)
    }
  }, [inAddress, roll, typed, write])

  const pickRole = useCallback(
    (filter: RoleFilter | undefined): void => {
      write({ ...(typed !== "" && { q: typed }), ...(filter !== undefined && { roll: filter }) })
    },
    [typed, write],
  )

  return { onText: setText, pickRole, query: useDeferredValue(typed), roll, text }
}
