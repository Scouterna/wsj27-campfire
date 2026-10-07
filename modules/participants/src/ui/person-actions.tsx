import type { OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * What other parts of the product offer to do about one person – the entries their
 * screen's overflow menu carries, by member number. The application composes it, so this
 * module never learns which module an entry leads into or who may see it.
 */
export type PersonActions = (memberNo: string) => readonly OverflowMenuItem[]

/**
 * Nothing offered, outside a provider – a story or a test sees a person with no menu.
 * @returns No entries.
 */
const none: PersonActions = () => []

const PersonActionsContext = createContext<PersonActions>(none)

/**
 * The entries to hold, and the subtree whose person screens show them.
 */
export interface PersonActionsProviderProps {
  /**
   * What is offered about a person, already narrowed to what the signed-in person may do.
   */
  readonly actions: PersonActions
  /**
   * The subtree whose person screens carry the entries.
   */
  readonly children: ReactNode
}

/**
 * Puts what other parts of the product offer about a person where the person screen can
 * read it. Mounted once by the application's composition root.
 * @param props The entries, and the subtree that shows them.
 * @returns The subtree, with the entries in scope.
 */
export function PersonActionsProvider(props: PersonActionsProviderProps): ReactElement {
  return (
    <PersonActionsContext.Provider value={props.actions}>
      {props.children}
    </PersonActionsContext.Provider>
  )
}

/**
 * What the nearest provider offers about a person, or nothing outside one.
 * @returns The entries for a member number.
 */
export function usePersonActions(): PersonActions {
  return useContext(PersonActionsContext)
}
