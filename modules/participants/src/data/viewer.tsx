import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * Who is reading the list of participants, as the participants service's gates see them.
 * The application's composition root distills this from the signed-in identity and mounts
 * it once; every query in this module reads it, because the real service has no "give me
 * what I may see" endpoint – the client has to ask for the right things.
 */
export interface Viewer {
  /**
   * The signed-in person's member number – the key of their own record, and empty when
   * nobody is signed in.
   */
  readonly memberNo: string
  /**
   * The unit a leader may read in full. Undefined for everyone else.
   */
  readonly unitNumber?: number
  /**
   * Whether the whole contingent is theirs to read – the contingent management.
   */
  readonly readsEveryone: boolean
  /**
   * Whether health answers are theirs to read beyond their own unit – the health grants
   * the participants service recognizes.
   */
  readonly readsHealth: boolean
}

/**
 * The viewer before anyone has signed in. Every query is disabled under it, so a screen
 * mounted outside a session asks the network nothing.
 */
const nobody: Viewer = { memberNo: "", readsEveryone: false, readsHealth: false }

const ViewerContext = createContext<Viewer>(nobody)

/**
 * The viewer to hold, and the subtree that reads as them.
 */
export interface ViewerProviderProps {
  /**
   * The subtree whose reads run as this viewer – in practice the whole signed-in
   * application.
   */
  readonly children: ReactNode
  /**
   * Who is reading the list of participants – see `Viewer`.
   */
  readonly viewer: Viewer
}

/**
 * Puts the viewer where this module's hooks can read it. Mounted once by the
 * application's composition root, inside the session gate – there is exactly one viewer
 * per session, which is what lets the query keys stay constant.
 * @param props The viewer, and the subtree that reads as them.
 * @returns The subtree, with the viewer in scope.
 */
export function ViewerProvider(props: ViewerProviderProps): ReactElement {
  return <ViewerContext.Provider value={props.viewer}>{props.children}</ViewerContext.Provider>
}

/**
 * The viewer the nearest provider holds, or nobody outside one – a hook rendered before
 * sign-in resolves must read as "ask nothing" rather than throw.
 * @returns Who is reading.
 */
export function useViewer(): Viewer {
  return useContext(ViewerContext)
}
