import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * Whether the signed-in person is granted a section.
 * @param id The section's id, as its screens' `tab` names it.
 * @returns True when the section is granted.
 */
export type SectionLookup = (id: string) => boolean

/**
 * The lookup outside a provider, which grants nothing, so a screen that asks before the
 * application has said fails closed rather than offering a section to everyone.
 * @returns False, whatever is asked.
 */
const isNeverGranted: SectionLookup = () => false

const SectionsContext = createContext<SectionLookup>(isNeverGranted)

/**
 * The application's answer to which sections the signed-in person is granted, and the
 * subtree that reads it.
 */
export interface SectionsProviderProps {
  /**
   * The subtree whose screens ask which sections they may lead to.
   */
  readonly children: ReactNode
  /**
   * Whether a section is granted, by its id. The application's own rule, so a screen that
   * places another module's piece asks here rather than repeating it.
   */
  readonly isGranted: SectionLookup
}

/**
 * Hands the application's section rule down to the screens, the way the reveals are, so
 * a screen can follow it without knowing which module or which service decides it.
 * @param props The rule, and the subtree that reads it.
 * @returns The subtree, with the rule in scope.
 */
export function SectionsProvider(props: SectionsProviderProps): ReactElement {
  return <SectionsContext value={props.isGranted}>{props.children}</SectionsContext>
}

/**
 * Whether the signed-in person is granted a section, asked by id – false outside a
 * provider, and false for an id no section carries.
 * @returns The lookup, answering by a section's id.
 */
export function useSectionLookup(): SectionLookup {
  return useContext(SectionsContext)
}
