import { createContext, useContext, type ReactElement, type ReactNode } from "react"

/**
 * What another part of the product draws in the image maker for an image made for a unit,
 * by its number – the people of the unit who said no to pictures of them being published.
 * The application composes it, and what is drawn decides for itself who the reader may see.
 */
export type WithheldSlot = (unitNumber: number) => ReactNode

/**
 * Nothing drawn, outside a provider – a story or a test sees the image maker alone.
 * @returns Nothing, whichever unit is asked about.
 */
const drawsNothing: WithheldSlot = () => null

const WithheldSlotContext = createContext<WithheldSlot>(drawsNothing)

/**
 * What the slot draws, and the subtree whose image maker shows it.
 */
export interface WithheldSlotProviderProps {
  /**
   * The subtree whose image maker carries the slot.
   */
  readonly children: ReactNode
  /**
   * What to draw for a unit. Kept stable, because the image maker redraws on it.
   */
  readonly slot: WithheldSlot
}

/**
 * Puts what other parts of the product draw for a unit where the image maker can read it.
 * Mounted once by the application's composition root.
 * @param props The slot, and the subtree that shows it.
 * @returns The subtree, with the slot in scope.
 */
export function WithheldSlotProvider(props: WithheldSlotProviderProps): ReactElement {
  return <WithheldSlotContext value={props.slot}>{props.children}</WithheldSlotContext>
}

/**
 * What the nearest provider draws for a unit, or nothing outside one.
 * @returns The slot, by unit number.
 */
export function useWithheldSlot(): WithheldSlot {
  return useContext(WithheldSlotContext)
}
