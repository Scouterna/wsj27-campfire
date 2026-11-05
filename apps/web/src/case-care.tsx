import { SubjectSlotProvider, type SubjectSlot } from "@scouterna/wsj27-campfire-cases"
import { CareGlance } from "@scouterna/wsj27-campfire-participants"
import type { ReactElement, ReactNode } from "react"

/**
 * What `CaseCare` wraps.
 */
export interface CaseCareProps {
  /**
   * The subtree whose case screens carry the participants' care.
   */
  readonly children: ReactNode
}

/**
 * What the participants section draws on a person's card on a case. It decides for itself
 * whether the reader may see the person's health.
 * @param memberNo The person, by member number.
 * @returns The care glance, which draws nothing for anybody who may not.
 */
const careOnCase: SubjectSlot = (memberNo) => <CareGlance memberNo={memberNo} />

/**
 * Puts the participants section's care on the person cards of the cases section.
 * Composed here, because a case and a person's health belong to different modules.
 * @param props The subtree that shows the care.
 * @returns The subtree, with the care in scope.
 */
export function CaseCare(props: CaseCareProps): ReactElement {
  return <SubjectSlotProvider slot={careOnCase}>{props.children}</SubjectSlotProvider>
}
