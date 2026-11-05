import { casesPersonMenu, casesUnitMenu, useCasesAccess } from "@scouterna/wsj27-campfire-cases"
import { ActionsProvider } from "@scouterna/wsj27-campfire-participants"
import { useSectionLookup } from "@scouterna/wsj27-campfire-ui"
import { useCallback, type ReactElement, type ReactNode } from "react"

/**
 * What `ParticipantMenus` wraps.
 */
export interface ParticipantMenusProps {
  /**
   * The subtree whose person and unit screens carry the cases' entries.
   */
  readonly children: ReactNode
}

/**
 * What other sections offer on a person's and a unit's own screens, each only where the
 * section itself is granted – the cases about them, and a new one. Composed here, because
 * those screens and the cases belong to different modules.
 * @param props The subtree that shows the entries.
 * @returns The subtree, with the entries in scope.
 */
export function ParticipantMenus(props: ParticipantMenusProps): ReactElement {
  const isSectionGranted = useSectionLookup()
  const { canOpen } = useCasesAccess()
  const hasCases = isSectionGranted("cases")
  const person = useCallback(
    (memberNo: string) => (hasCases ? casesPersonMenu(memberNo, canOpen) : []),
    [canOpen, hasCases],
  )
  const unit = useCallback(
    (unitNumber: number) => (hasCases ? casesUnitMenu(unitNumber, canOpen) : []),
    [canOpen, hasCases],
  )
  return (
    <ActionsProvider person={person} unit={unit}>
      {props.children}
    </ActionsProvider>
  )
}
