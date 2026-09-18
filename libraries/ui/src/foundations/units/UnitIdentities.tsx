import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * What is publicly known about the units' identities: their names, and where their
 * glyphs are served. The identities are data the application loads at runtime rather
 * than code – an application that could not load them answers undefined for
 * everything, and every consumer falls back to the number.
 */
export interface UnitIdentities {
  /**
   * Where the unit's white glyph is served, or undefined while none is known.
   */
  readonly glyphSrc: (unitNumber: number) => string | undefined
  /**
   * The unit's name – "Björnen" – or undefined while none is known.
   */
  readonly name: (unitNumber: number) => string | undefined
}

// The answer before anything is known – what every lookup gives until the
// application loads the identities.
function unknown(): undefined {
  // Undefined, always – the declared return type is the whole of it.
}

/**
 * The identities before anything is known – what a story and a test read outside a
 * provider.
 */
const nothingKnown: UnitIdentities = {
  glyphSrc: unknown,
  name: unknown,
}

const UnitIdentitiesContext = createContext(nothingKnown)

export interface UnitIdentitiesProviderProps {
  /**
   * The identities as the application loaded them.
   */
  readonly identities: UnitIdentities
  /**
   * The subtree that draws and names units.
   */
  readonly children: ReactNode
}

/**
 * Puts the units' identities where every avatar and name line can read them. Mounted
 * once by the composition root, with whatever its identity data held – possibly
 * nothing, which every consumer must wear gracefully.
 *
 * @param props The loaded identities, and the subtree reading them.
 * @returns The subtree.
 */
export function UnitIdentitiesProvider(props: UnitIdentitiesProviderProps): ReactElement {
  return (
    <UnitIdentitiesContext.Provider value={props.identities}>
      {props.children}
    </UnitIdentitiesContext.Provider>
  )
}

/**
 * The units' identities from the nearest provider – or a table that knows nothing,
 * outside one.
 *
 * @returns The identities.
 */
export function useUnitIdentities(): UnitIdentities {
  return useContext(UnitIdentitiesContext)
}
