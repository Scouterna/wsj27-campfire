import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

import { isRevealBypassed, type Reveal } from "./reveals"

/**
 * The curtains as the subtree sees them: which ids are hung at all, and which of
 * those are open. An id nobody hung reads as open – a curtain is something an
 * application hangs deliberately, and everything else is the ordinary, open product.
 */
interface RevealState {
  readonly hung: ReadonlySet<string>
  readonly open: ReadonlySet<string>
}

const nothingHung: RevealState = { hung: new Set(), open: new Set() }

const RevealContext = createContext(nothingHung)

/**
 * Whether one reveal has opened, by the moment or by the development bypass this
 * browser holds.
 * @param reveal The reveal to ask about.
 * @returns True when open.
 */
function isOpenNow(reveal: Reveal): boolean {
  return isRevealBypassed(reveal.id) || Date.now() >= reveal.at.getTime()
}

/**
 * Schedules one reveal's opening: a timer that adds its id to the open set at the
 * moment – a beat past it, so a clock read on waking is unambiguously beyond.
 * @param reveal The reveal to wake for.
 * @param setOpen The open set's setter.
 * @returns The timer, for the effect to clear.
 */
function wakeAt(
  reveal: Reveal,
  setOpen: (update: (previous: ReadonlySet<string>) => ReadonlySet<string>) => void,
): ReturnType<typeof setTimeout> {
  const wait = Math.max(0, reveal.at.getTime() - Date.now()) + 50

  // setTimeout's delay is a signed 32-bit count of milliseconds: anything past ~24.8
  // days overflows and fires immediately, which would open the curtain on the spot.
  // A far-off moment sleeps a day at a time and re-arms until the real wait fits.
  const day = 24 * 60 * 60 * 1000
  if (wait > day) {
    return setTimeout(() => {
      wakeAt(reveal, setOpen)
    }, day)
  }

  return setTimeout(() => {
    setOpen((previous) => new Set([...previous, reveal.id]))
  }, wait)
}

export interface RevealProviderProps {
  /**
   * The curtains to hang. Give the same array instance across renders – a module
   * constant – so the timers are not remade every render.
   */
  readonly reveals: readonly Reveal[]
  /**
   * The subtree whose reveal-dependent pieces read these curtains.
   */
  readonly children: ReactNode
}

/**
 * The product's curtains: each reveal stays closed until its moment, then opens –
 * live, because the provider wakes itself at each moment and re-renders everything
 * that reads it. Several can hang, and count down, at once; each opens on its own
 * clock.
 *
 * Mounted once by the composition root, with every reveal the product currently has.
 *
 * @param props The curtains, and the subtree under them.
 * @returns The subtree, told which curtains are open.
 */
export function RevealProvider(props: RevealProviderProps): ReactElement {
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(props.reveals.filter((reveal) => isOpenNow(reveal)).map((reveal) => reveal.id)),
  )

  useEffect(() => {
    const timers = props.reveals
      .filter((reveal) => !open.has(reveal.id))
      .map((reveal) => wakeAt(reveal, setOpen))
    return () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
    }
  }, [open, props.reveals])

  const value = useMemo<RevealState>(
    () => ({ hung: new Set(props.reveals.map((reveal) => reveal.id)), open }),
    [open, props.reveals],
  )

  return <RevealContext.Provider value={value}>{props.children}</RevealContext.Provider>
}

/**
 * Whether the named curtain is open. An id no provider hung is open – see
 * `RevealProvider` – so a consumer can gate by an id before the application hangs it.
 *
 * @param id The reveal's id.
 * @returns True when open, re-rendering the caller at the moment it opens.
 */
export function useIsRevealed(id: string): boolean {
  const { hung, open } = useContext(RevealContext)
  return hung.has(id) ? open.has(id) : true
}

/**
 * The same answer as `useIsRevealed`, as a lookup – for the one place that decides
 * for many ids at once, the way the application's section predicates do.
 *
 * @returns The lookup, re-rendering the caller whenever any curtain opens.
 */
export function useRevealLookup(): (id: string) => boolean {
  const { hung, open } = useContext(RevealContext)
  return useMemo(() => (id: string) => (hung.has(id) ? open.has(id) : true), [hung, open])
}
