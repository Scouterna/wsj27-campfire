import { useCallback, useState, type ReactElement } from "react"

import { useViewer } from "../data/viewer"
import type { Participant } from "../model/Participant"
import { CareSheet } from "./components/caresheet/CareSheet"
import { CareUnknown } from "./components/careunknown/CareUnknown"
import { useUnitCare, type UnitCare } from "./use-unit-care"

/**
 * What a list hands its rows: each person's care, and the one sheet between them.
 */
export interface CareSheets extends UnitCare {
  /**
   * The quiet line to place over the rows, which speaks only where people of the leader's
   * own unit are among them and their care could not be read.
   */
  readonly notice: ReactElement
  /**
   * Opens a person's sheet, by member number. The same function for as long as the list
   * lives, so handing it to a memoized row costs nothing.
   */
  readonly onOpen: (memberNo: string) => void
  /**
   * The open sheet, to mount outside the rows. Null while none is.
   */
  readonly sheet: ReactElement | null
}

/**
 * The care of the leader's unit for a list of people, with the open sheet kept here
 * rather than in the row that opened it, so it stays open when a virtual list takes that
 * row away. Call it once for the screen, above whatever the people are drawn in, so the
 * read and the open sheet outlive a list that changes shape.
 * @param people The people the screen lists, which decide whether a failed read is worth
 *   saying – it is not over people whose care this reader is never shown.
 * @returns The care, the sheet, and how a row opens it.
 */
export function useCareSheets(people: readonly Participant[]): CareSheets {
  const viewer = useViewer()
  const unitCare = useUnitCare()
  const [openMemberNo, setOpenMemberNo] = useState<string | undefined>()
  const close = useCallback(() => {
    setOpenMemberNo(undefined)
  }, [])
  const open = openMemberNo === undefined ? undefined : unitCare.byMemberNo.get(openMemberNo)
  const hasOwnUnit =
    viewer.unitNumber !== undefined &&
    people.some((person) => person.unit?.number === viewer.unitNumber)

  return {
    ...unitCare,
    notice: <CareUnknown isShown={unitCare.isUnknown && hasOwnUnit} />,
    onOpen: setOpenMemberNo,
    sheet: open === undefined ? null : <CareSheet onClose={close} person={open.person} />,
  }
}
