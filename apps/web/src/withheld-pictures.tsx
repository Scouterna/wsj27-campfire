import { WithheldSlotProvider, type WithheldSlot } from "@scouterna/wsj27-campfire-material"
import { WithheldPictures } from "@scouterna/wsj27-campfire-participants"
import type { ReactElement, ReactNode } from "react"

/**
 * What `PicturesWithheld` wraps.
 */
export interface PicturesWithheldProps {
  /**
   * The subtree whose image maker names the people who said no.
   */
  readonly children: ReactNode
}

/**
 * What the participants section draws in the image maker for a unit. It decides for
 * itself whom the reader may see.
 * @param unitNumber The unit the image is made for.
 * @returns The unit's people who said no, or nothing.
 */
const withheldInUnit: WithheldSlot = (unitNumber) => <WithheldPictures unitNumber={unitNumber} />

/**
 * Puts the people who said no to published pictures in the material section's image
 * maker. Composed here, because the image maker and the list of participants belong to
 * different modules.
 * @param props The subtree that shows them.
 * @returns The subtree, with them in scope.
 */
export function PicturesWithheld(props: PicturesWithheldProps): ReactElement {
  return <WithheldSlotProvider slot={withheldInUnit}>{props.children}</WithheldSlotProvider>
}
