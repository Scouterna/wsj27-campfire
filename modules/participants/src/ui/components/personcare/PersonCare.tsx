import { useState, type ReactElement } from "react"

import type { Care } from "../../../model/Care"
import { fullName } from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { CareButton } from "../carebutton/CareButton"
import { CareSheet } from "../caresheet/CareSheet"

/**
 * The person whose care a `PersonCare` shows, and what it comes to.
 */
export interface PersonCareProps {
  /**
   * What they need, at a glance.
   */
  readonly care: Care
  /**
   * Their record in full, which the sheet is drawn from.
   */
  readonly person: ParticipantDetail
}

/**
 * A person's care where they stand alone rather than in a list: the button, and the sheet
 * it opens.
 * @param props The person, and their care.
 * @returns The button, and the sheet while it is open.
 */
export function PersonCare(props: PersonCareProps): ReactElement {
  const { care, person } = props
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <CareButton
        care={care}
        name={fullName(person)}
        onPress={() => {
          setOpen(true)
        }}
      />
      {isOpen && (
        <CareSheet
          onClose={() => {
            setOpen(false)
          }}
          person={person}
        />
      )}
    </>
  )
}
