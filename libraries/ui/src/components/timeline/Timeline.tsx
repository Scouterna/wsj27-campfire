import type { ReactElement, ReactNode } from "react"

import { PersonIcon } from "../../foundations/icons/set/PersonIcon"
import { formatTimelineMoment } from "../../foundations/moments/moments"

import "./Timeline.css"

export interface TimelineProps {
  /**
   * The entries, newest first – each a `TimelineEntry`.
   */
  readonly children: ReactNode
  /**
   * What the list is called for assistive technology, since the rail has no heading of
   * its own.
   */
  readonly label: string
}

/**
 * A history down one rail, newest first: what people wrote, and the moments something
 * happened.
 * @param props The entries, and the list's name.
 * @returns The timeline.
 */
export function Timeline(props: TimelineProps): ReactElement {
  return (
    <ol aria-label={props.label} className="timeline">
      {props.children}
    </ol>
  )
}

export interface TimelineEntryProps {
  /**
   * The entry itself – what somebody wrote, or the sentence an event is told in.
   */
  readonly children: ReactNode
  /**
   * The moment the entry happened, written for reading relative to today.
   */
  readonly at: Date
  /**
   * Whether the entry is something that happened rather than something somebody
   * wrote – told as a quiet line instead of on a card.
   */
  readonly isEvent?: boolean
  /**
   * The heading of the entry – who wrote it, or what happened.
   */
  readonly title: string
}

/**
 * One entry on the rail: the avatar, the moment in small capitals, the heading, and the
 * entry on its card – or, for an event, a quiet line.
 * @param props The entry, and when and by whom it happened.
 * @returns The entry.
 */
export function TimelineEntry(props: TimelineEntryProps): ReactElement {
  return (
    <li className="timeline-entry">
      <span aria-hidden="true" className="timeline-avatar">
        <PersonIcon />
      </span>
      <div className="timeline-body">
        <time className="timeline-when" dateTime={props.at.toISOString()}>
          {formatTimelineMoment(props.at)}
        </time>
        <p className="timeline-title">{props.title}</p>
        <div className={props.isEvent === true ? "timeline-event" : "timeline-card"}>
          {props.children}
        </div>
      </div>
    </li>
  )
}
