import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * The way out before the application has handed one in: pressing it does nothing. A
 * story draws the profile page outside a session, and must not navigate the catalog
 * away.
 */
function stay(): void {
  // Nothing to leave.
}

const SignOutContext = createContext<() => void>(stay)

export interface SignOutProviderProps {
  /**
   * The subtree that may sign out – in practice the whole signed-in application.
   */
  readonly children: ReactNode
  /**
   * Ends the session. The application's own composition: what it has cached is
   * forgotten first, and then this module's sign-out round trip leaves the page.
   */
  readonly onSignOut: () => void
}

/**
 * Hands the profile page its way out. Signing out is more than this module's round
 * trip – the cache the application keeps has to go first – and a routed screen takes no
 * props, so the application mounts this once, at the gate, with the whole of it.
 * @param props The way out, and the subtree that may take it.
 * @returns The provider.
 */
export function SignOutProvider(props: SignOutProviderProps): ReactElement {
  return <SignOutContext.Provider value={props.onSignOut}>{props.children}</SignOutContext.Provider>
}

/**
 * The way out the nearest `SignOutProvider` holds.
 * @returns What ends the session, or a function that does nothing outside a provider.
 */
export function useSignOut(): () => void {
  return useContext(SignOutContext)
}
