import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

import { isRevealBypassed, wakeAt, type Reveal } from "./reveals"

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
 * An update to the open set that adds one reveal.
 * @param id The reveal that opened.
 * @returns The update, for the open set's setter.
 */
function withOpened(id: string): (previous: ReadonlySet<string>) => ReadonlySet<string> {
  return (previous) => new Set([...previous, id])
}

/**
 * The curtains a `RevealProvider` hangs, and the subtree that reads them.
 */
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
 * clock. Mounted once, at the composition root.
 *
 * @param props The curtains, and the subtree under them.
 * @returns The subtree, told which curtains are open.
 */
export function RevealProvider(props: RevealProviderProps): ReactElement {
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(props.reveals.filter((reveal) => isOpenNow(reveal)).map((reveal) => reveal.id)),
  )

  useEffect(() => {
    const cancels = props.reveals
      .filter((reveal) => !open.has(reveal.id))
      .map((reveal) =>
        wakeAt(reveal, () => {
          setOpen(withOpened(reveal.id))
        }),
      )
    return () => {
      for (const cancel of cancels) {
        cancel()
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
 * Whether the named curtain is open. An id no provider hung is open, so a consumer can
 * gate by an id before the application hangs it.
 *
 * @param id The reveal's id.
 * @returns True when open, re-rendering the caller at the moment it opens.
 */
export function useIsRevealed(id: string): boolean {
  const { hung, open } = useContext(RevealContext)
  return hung.has(id) ? open.has(id) : true
}

/**
 * The same answer as `useIsRevealed`, as a lookup for a caller that decides many ids at
 * once.
 *
 * @returns The lookup, re-rendering the caller whenever any curtain opens.
 */
export function useRevealLookup(): (id: string) => boolean {
  const { hung, open } = useContext(RevealContext)
  return useMemo(() => (id: string) => (hung.has(id) ? open.has(id) : true), [hung, open])
}
