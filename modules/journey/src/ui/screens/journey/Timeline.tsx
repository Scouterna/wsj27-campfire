import { useState, type ReactElement } from "react"

import { isCovering, zoneOf, type ItineraryItem } from "../../../model/Itinerary"
import { dayKey, middayOf, phaseOf, tripDays } from "./days"
import { clock, dayName, kindLabels, span, whereLine } from "./format"
import { chevronIcon, kindIcon } from "./icons"
import { PlaceMap } from "./map/PlaceMap"

import "./Timeline.css"

export type TimelineProps = {
  /**
   * The moment looked at – what covers it is drawn as now, and the days before it fold
   * away.
   */
  readonly at: Date
  /**
   * The unit's items, in start order.
   */
  readonly items: readonly ItineraryItem[]
}

/**
 * The unit's itinerary as one rail, after the journey design: a day heading over each
 * day's items, every item a node on the rail with its time, title, and place, and its
 * description on a sheet beside. What covers the moment is filled in the theme's dark ink.
 * The days before the moment fold behind one row, so the rail opens where the unit is.
 * @param props The moment and the items.
 * @returns The rail.
 */
export function Timeline(props: TimelineProps): ReactElement {
  const { at, items } = props
  const [isEarlierOpen, setIsEarlierOpen] = useState(false)
  const today = dayKey(at)
  const allDays = tripDays(items)
  const byDay = Map.groupBy(items, (item) => dayKey(item.start))
  const earlierDays = allDays.filter((day) => day < today && byDay.has(day))
  const earlierCount = earlierDays.reduce((sum, day) => sum + (byDay.get(day)?.length ?? 0), 0)
  const mapped = mappedItems(items)
  const shownDays = allDays.filter(
    (day) => byDay.has(day) && (isEarlierOpen || day >= today || earlierCount === 0),
  )

  return (
    <ol className="timeline">
      {earlierCount > 0 && (
        <li className="timeline-earlier">
          <button
            aria-expanded={isEarlierOpen}
            aria-label={isEarlierOpen ? "Dölj tidigare händelser" : "Visa tidigare händelser"}
            className="timeline-node timeline-node-button"
            type="button"
            onClick={() => {
              setIsEarlierOpen((isOpen) => !isOpen)
            }}
          >
            {chevronIcon()}
          </button>
          <div>
            <p className="timeline-date">{range(earlierDays)}</p>
            <p className="timeline-earlier-label">
              {isEarlierOpen ? "Dölj" : "Visa"} {String(earlierCount)} tidigare händelser
            </p>
          </div>
        </li>
      )}
      {shownDays.map((day) => (
        <li key={day} className={day < today ? "timeline-day timeline-day-past" : "timeline-day"}>
          <h2 className="timeline-date">
            {dayName(middayOf(day), "Europe/Stockholm")}
            {day === today ? " · idag" : ""}
            {phaseOf(day) === "camp" ? ` · lägerdag ${String(campDay(allDays, day))}` : ""}
          </h2>
          <ol className="timeline-items">
            {(byDay.get(day) ?? []).map((item) => (
              <Entry key={item.id} at={at} hasMap={mapped.has(item.id)} item={item} />
            ))}
          </ol>
        </li>
      ))}
    </ol>
  )
}

type EntryProps = {
  /**
   * The moment looked at.
   */
  readonly at: Date
  /**
   * Whether the entry shows its place on a small map.
   */
  readonly hasMap: boolean
  /**
   * The item.
   */
  readonly item: ItineraryItem
}

/**
 * One item on the rail.
 * @param props The moment and the item.
 * @returns The entry.
 */
function Entry(props: EntryProps): ReactElement {
  const { at, hasMap, item } = props
  const isNow = isCovering(item, at)
  const isPast = item.end <= at
  const where = whereLine(item)
  let state = "timeline-item"
  if (isNow) {
    state += " timeline-item-now"
  } else if (isPast) {
    state += " timeline-item-past"
  }

  return (
    <li className={state}>
      <span className="timeline-node">{kindIcon(item.kind)}</span>
      <div className="timeline-body">
        <p className="timeline-meta">
          {kindLabels[item.kind]} ·{" "}
          {item.delayMinutes === undefined ? null : (
            <>
              <s>{clock(item.plannedStart, zoneOf(item))}</s>{" "}
            </>
          )}
          {span(item)}
          {item.delayMinutes === undefined ? null : (
            <span className="timeline-delay">Försenad {String(item.delayMinutes)} min</span>
          )}
        </p>
        <h3 className="timeline-title">
          {isNow ? "Nu – " : ""}
          {item.title}
        </h3>
        {where === "" ? null : <p className="timeline-where">{where}</p>}
        {item.description === undefined ? null : (
          <p className="timeline-sheet">{item.description}</p>
        )}
        {item.notes.map((note) => (
          <p key={note} className="timeline-note">
            <strong>För avdelningen</strong>
            {note}
          </p>
        ))}
        {hasMap ? <PlaceMap item={item} /> : null}
      </div>
    </li>
  )
}

/**
 * The items that show their place on a map: every journey, and the first item at each new
 * place – so a week at the camp shows the camp once rather than on every row.
 * @param items The items, in start order.
 * @returns The ids of the items with a map.
 */
function mappedItems(items: readonly ItineraryItem[]): ReadonlySet<string> {
  const mapped = new Set<string>()
  let lastPlace: string | undefined
  for (const item of items) {
    if (item.kind === "travel") {
      if (item.from?.coordinates !== undefined && item.to?.coordinates !== undefined) {
        mapped.add(item.id)
      }
      lastPlace = item.to?.name
      continue
    }
    if (item.place?.coordinates !== undefined && item.place.name !== lastPlace) {
      mapped.add(item.id)
      lastPlace = item.place.name
    }
  }
  return mapped
}

/**
 * Which day of the camp a day is, counting the arrival day as the first.
 * @param days Every day of the trip.
 * @param day The day.
 * @returns The camp day's number.
 */
function campDay(days: readonly string[], day: string): number {
  return days.filter((candidate) => phaseOf(candidate) === "camp" && candidate <= day).length
}

/**
 * A run of days as "21 juli – 28 juli".
 * @param days The days, in order.
 * @returns The range, or the one day.
 */
function range(days: readonly string[]): string {
  const first = dateOf(days[0])
  const last = dateOf(days.at(-1))
  return first === last ? first : `${first} – ${last}`
}

/**
 * A day as "21 juli".
 * @param key The day, if any.
 * @returns The date, empty without a day.
 */
function dateOf(key: string | undefined): string {
  return key === undefined
    ? ""
    : new Intl.DateTimeFormat("sv-SE", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Stockholm",
      }).format(middayOf(key))
}
