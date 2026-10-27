import type { OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from "react"

/**
 * What other parts of the product offer to do about one person – the entries their
 * screen's overflow menu carries, by member number. The application composes it, so this
 * module never learns which module an entry leads into or who may see it.
 */
export type PersonActions = (memberNo: string) => readonly OverflowMenuItem[]

/**
 * What other parts of the product offer to do about one unit – the entries its screen's
 * overflow menu carries, by unit number – composed by the application as a person's are.
 */
export type UnitActions = (unitNumber: number) => readonly OverflowMenuItem[]

/**
 * What both screens are offered.
 */
interface Actions {
  readonly person: PersonActions
  readonly unit: UnitActions
}

/**
 * Nothing offered, outside a provider – a story or a test sees screens with no menu.
 */
const none: Actions = { person: () => [], unit: () => [] }

const ActionsContext = createContext<Actions>(none)

/**
 * The entries to hold, and the subtree whose person and unit screens show them.
 */
export interface ActionsProviderProps {
  /**
   * The subtree whose person and unit screens carry the entries.
   */
  readonly children: ReactNode
  /**
   * What is offered about a person, already narrowed to what the signed-in person may do.
   */
  readonly person: PersonActions
  /**
   * What is offered about a unit, already narrowed to what the signed-in person may do.
   */
  readonly unit: UnitActions
}

/**
 * Puts what other parts of the product offer about a person or a unit where their screens
 * can read it. Mounted once by the application's composition root.
 * @param props The entries, and the subtree that shows them.
 * @returns The subtree, with the entries in scope.
 */
export function ActionsProvider(props: ActionsProviderProps): ReactElement {
  const { person, unit } = props
  // The same value while neither changes, so the screens under it do not redraw for it.
  const value = useMemo(() => ({ person, unit }), [person, unit])
  return <ActionsContext value={value}>{props.children}</ActionsContext>
}

/**
 * What the nearest provider offers about a person, or nothing outside one.
 * @returns The entries for a member number.
 */
export function usePersonActions(): PersonActions {
  return useContext(ActionsContext).person
}

/**
 * What the nearest provider offers about a unit, or nothing outside one.
 * @returns The entries for a unit number.
 */
export function useUnitActions(): UnitActions {
  return useContext(ActionsContext).unit
}
