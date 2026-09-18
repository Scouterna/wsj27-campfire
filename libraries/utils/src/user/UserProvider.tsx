import { createContext, useContext, type ReactElement, type ReactNode } from "react"

import type { User } from "./user"

const UserContext = createContext<User | undefined>(undefined)

export interface UserProviderProps {
  /**
   * The subtree that may ask – in practice the whole signed-in application.
   */
  readonly children: ReactNode
  /**
   * The signed-in person. The application mounts this once, at the gate, from the
   * session it resolved.
   */
  readonly user: User
}

/**
 * Makes the signed-in person readable anywhere below, so a module that counts on a fact
 * about them – how they travel, which unit is theirs – reads it where it is used,
 * without learning which module resolved it.
 * @param props The person to hold, and the subtree that may read them.
 * @returns The provider.
 */
export function UserProvider(props: UserProviderProps): ReactElement {
  return <UserContext.Provider value={props.user}>{props.children}</UserContext.Provider>
}

/**
 * The signed-in person the nearest `UserProvider` holds.
 * @returns The person, or undefined outside a provider – a story, or a screen drawn
 * before anybody is signed in – which honestly reads as knowing nothing about them.
 */
export function useUser(): User | undefined {
  return useContext(UserContext)
}
