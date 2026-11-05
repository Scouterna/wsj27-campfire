import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * What another part of the product draws at the end of a person's card on a case, by
 * member number. The application composes it, and what is drawn decides for itself what
 * the reader may see of the person, whatever the case.
 */
export type SubjectSlot = (memberNo: string) => ReactNode

/**
 * Nothing drawn, outside a provider – a story or a test sees the card alone.
 * @returns Nothing, whoever is asked about.
 */
const drawsNothing: SubjectSlot = () => null

const SubjectSlotContext = createContext<SubjectSlot>(drawsNothing)

/**
 * What the slot draws, and the subtree whose case screens show it.
 */
export interface SubjectSlotProviderProps {
  /**
   * The subtree whose case screens carry the slot.
   */
  readonly children: ReactNode
  /**
   * What to draw for a person. Kept stable, because the case screens redraw on it.
   */
  readonly slot: SubjectSlot
}

/**
 * Puts what other parts of the product draw on a person's card where the case screens can
 * read it. Mounted once by the application's composition root.
 * @param props The slot, and the subtree that shows it.
 * @returns The subtree, with the slot in scope.
 */
export function SubjectSlotProvider(props: SubjectSlotProviderProps): ReactElement {
  return <SubjectSlotContext value={props.slot}>{props.children}</SubjectSlotContext>
}

/**
 * What the nearest provider draws on a person's card, or nothing outside one.
 * @returns The slot, by member number.
 */
export function useSubjectSlot(): SubjectSlot {
  return useContext(SubjectSlotContext)
}
