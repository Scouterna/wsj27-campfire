import type { ReactElement } from "react"

import { useWithheldSlot } from "../../withheld-slot"

import "./PublishingReminder.css"

/**
 * Whose people a `PublishingReminder` names.
 */
export interface PublishingReminderProps {
  /**
   * The unit the image is for, whose people who said no are named. Left out where the
   * reader picks who the image is for, and the names sit beside that choice instead.
   */
  readonly unitNumber?: number
}

/**
 * What to make sure of before publishing: by name, the people of the image's unit who
 * said no to pictures of them being published, and always a quiet line asking that
 * everybody in the picture said yes, because Campfire knows the unit but never who is in
 * the photo.
 * @param props The unit, if the reader's own.
 * @returns The reminder.
 */
export function PublishingReminder(props: PublishingReminderProps): ReactElement {
  const slot = useWithheldSlot()
  return (
    <div className="publishing-reminder">
      {props.unitNumber === undefined ? null : slot(props.unitNumber)}
      <p className="publishing-reminder-note">
        Se till att alla som syns på bilden har sagt ja till att bilder på dem publiceras.
      </p>
    </div>
  )
}
