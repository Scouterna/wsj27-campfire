import { Card, Chip, type ChipTone } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Update, UpdateKind } from "../../../model/Itinerary"
import { moment } from "./format"

import "./UpdatesCard.css"

export type UpdatesCardProps = {
  /**
   * The moment looked at – updates posted after it have not happened yet.
   */
  readonly at: Date
  /**
   * Who the updates are for, beside each one in the overview – absent on a unit's own
   * journey, where it goes without saying.
   */
  readonly reach?: (update: Update) => string
  /**
   * The updates, newest first.
   */
  readonly updates: readonly Update[]
}

const labels: Readonly<Record<UpdateKind, { readonly label: string; readonly tone: ChipTone }>> = {
  change: { label: "Ändring", tone: "warning" },
  delay: { label: "Försening", tone: "warning" },
  info: { label: "Info", tone: "neutral" },
  urgent: { label: "Akut", tone: "warning" },
}

/**
 * What the planners have posted – delays, changes, and notices – newest first, as far as the
 * moment looked at. Nothing when nothing has been posted yet.
 * @param props The moment and the updates.
 * @returns The card, or nothing.
 */
export function UpdatesCard(props: UpdatesCardProps): ReactElement | null {
  const { at, reach, updates } = props
  const posted = updates.filter((update) => update.posted <= at)
  if (posted.length === 0) {
    return null
  }
  return (
    <Card title="Uppdateringar">
      <ul className="updates">
        {posted.map((update) => (
          <li key={update.id} className={`updates-entry updates-${update.kind}`}>
            <p className="updates-meta">
              <Chip tone={labels[update.kind].tone}>{labels[update.kind].label}</Chip>
              <span>{moment(update.posted, "Europe/Stockholm")}</span>
              {reach === undefined ? null : <span>{reach(update)}</span>}
            </p>
            <h3 className="updates-title">{update.title}</h3>
            {update.message === undefined ? null : (
              <p className="updates-message">{update.message}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
