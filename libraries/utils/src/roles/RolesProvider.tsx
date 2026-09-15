import type { ReactElement, ReactNode } from "react"
import { createContext, useContext } from "react"

import type { Role } from "./roles"

const RolesContext = createContext<readonly Role[]>([])

/**
 * The roles to hold, and the subtree that may read them.
 */
export interface RolesProviderProps {
  /**
   * The subtree that may ask – in practice the whole signed-in application.
   */
  readonly children: ReactNode
  /**
   * The signed-in session's roles. The application mounts this once, at the gate.
   */
  readonly roles: readonly Role[]
}

/**
 * Makes the session's roles readable anywhere below, so any module asks with the role
 * helpers instead of having answers threaded down as props.
 * @param props The roles to hold, and the subtree that may read them.
 * @returns The provider.
 */
export function RolesProvider(props: RolesProviderProps): ReactElement {
  return <RolesContext.Provider value={props.roles}>{props.children}</RolesContext.Provider>
}

/**
 * The roles the nearest `RolesProvider` holds.
 * @returns The roles in force, or the empty set outside a provider – which honestly
 * reads as nobody granted anything.
 */
export function useRoles(): readonly Role[] {
  return useContext(RolesContext)
}
