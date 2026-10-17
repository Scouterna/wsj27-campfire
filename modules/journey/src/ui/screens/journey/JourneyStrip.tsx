import { Card } from "@scouterna/wsj27-campfire-ui"
import type { CSSProperties, ReactElement } from "react"

import type { ItineraryItem } from "../../../model/Itinerary"
import { dayKey, middayOf, phaseOf, tripDays, type Phase } from "./days"
import { dayName } from "./format"

import "./JourneyStrip.css"

export type JourneyStripProps = {
  /**
   * The moment looked at, whose day is the one marked.
   */
  readonly at: Date
  /**
   * The items whose days the strip shows, in start order.
   */
  readonly items: readonly ItineraryItem[]
  /**
   * Moves the moment to another day.
   */
  readonly onPick: (at: Date) => void
}

const countries: Readonly<Record<string, string>> = {
  Latvia: "Lettland",
  Lithuania: "Litauen",
  Poland: "Polen",
  Sweden: "Sverige",
}

/**
 * The whole trip as a strip of days – the road, the camp, and home – with the days gone
 * filled in and the day looked at raised. A day is a button that moves the moment to its
 * midday.
 * @param props The moment, the items, and what a tap does.
 * @returns The card.
 */
export function JourneyStrip(props: JourneyStripProps): ReactElement {
  const { at, items, onPick } = props
  const days = tripDays(items)
  const today = dayKey(at)
  const count = (phase: Phase): number => days.filter((day) => phaseOf(day) === phase).length

  return (
    <Card aside={status(days, today)} title="Resan">
      <div className="journey-strip">
        <ol className="journey-strip-days">
          {days.map((day) => (
            <li key={day}>
              <button
                aria-current={day === today ? "date" : undefined}
                aria-label={dayName(middayOf(day), "Europe/Stockholm")}
                className={`journey-strip-day journey-strip-${phaseOf(day)} ${tense(day, today)}`}
                type="button"
                onClick={() => {
                  onPick(middayOf(day))
                }}
              />
            </li>
          ))}
        </ol>
        <div className="journey-strip-labels">
          {count("travel") > 0 && (
            <p style={spanOf(count("travel"))}>
              <strong>{roadName(items)}</strong>
              <small>{span(days.filter((day) => phaseOf(day) === "travel"))}</small>
            </p>
          )}
          <p style={spanOf(count("camp"))}>
            <strong>World Scout Jamboree · Gdańsk</strong>
            <small>{span(days.filter((day) => phaseOf(day) === "camp"))}</small>
          </p>
          <p className="journey-strip-label-home" style={spanOf(count("home"))}>
            <strong>Hem</strong>
            <small>10/8</small>
          </p>
        </div>
      </div>
    </Card>
  )
}

/**
 * How many of the strip's columns a label spans – the one value here that has to be
 * inline, since it is counted from the plan.
 * @param days The days the label covers.
 * @returns The style carrying the span.
 */
function spanOf(days: number): CSSProperties {
  return { "--span": days } as CSSProperties
}

/**
 * Where a day stands against the day looked at.
 * @param day The day.
 * @param today The day looked at.
 * @returns The class.
 */
function tense(day: string, today: string): string {
  if (day === today) {
    return "journey-strip-today"
  }
  return day < today ? "journey-strip-past" : "journey-strip-future"
}

/**
 * The trip so far in a few words, for the strip's heading.
 * @param days Every day of the trip.
 * @param today The day looked at.
 * @returns The line.
 */
function status(days: readonly string[], today: string): string {
  const first = days[0]
  if (first === undefined) {
    return ""
  }
  if (today < first) {
    const left = Math.round((middayOf(first).getTime() - middayOf(today).getTime()) / 86_400_000)
    return `Avresa om ${String(left)} d`
  }
  if (today > (days.at(-1) ?? "")) {
    return "Hemma igen"
  }
  const phase = phaseOf(today)
  if (phase === "home") {
    return "Hemresa"
  }
  const ofPhase = days.filter((day) => phaseOf(day) === phase)
  const index = ofPhase.indexOf(today) + 1
  return `${phase === "camp" ? "Lägret" : "Resan"} · dag ${String(index)} av ${String(ofPhase.length)}`
}

/**
 * The countries the road passes before the camp, each once in the order first reached –
 * "Sverige → Lettland → Litauen".
 * @param items The items, in start order.
 * @returns The road's name.
 */
function roadName(items: readonly ItineraryItem[]): string {
  const seen: string[] = []
  for (const item of items) {
    if (phaseOf(dayKey(item.start)) !== "travel") {
      break
    }
    for (const place of [item.from, item.place, item.to]) {
      const country = place?.country === undefined ? undefined : countries[place.country]
      if (country !== undefined && !seen.includes(country)) {
        seen.push(country)
      }
    }
  }
  return seen.length === 0 ? "Resan" : seen.join(" → ")
}

/**
 * A run of days as "21–28 juli".
 * @param days The days, in order.
 * @returns The span.
 */
function span(days: readonly string[]): string {
  const first = days[0]
  const last = days.at(-1)
  if (first === undefined || last === undefined) {
    return ""
  }
  const isSameMonth = first.slice(0, 7) === last.slice(0, 7)
  return `${dayOfMonth(first, !isSameMonth)}–${dayOfMonth(last, true)}`
}

/**
 * A day as "21" or "21 juli".
 * @param key The day.
 * @param hasMonth Whether the month is named.
 * @returns The day.
 */
function dayOfMonth(key: string, hasMonth: boolean): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    ...(hasMonth && { month: "long" }),
    timeZone: "Europe/Stockholm",
  }).format(middayOf(key))
}
