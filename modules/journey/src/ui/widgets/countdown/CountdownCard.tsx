import { Card, Chip } from "@scouterna/wsj27-campfire-ui"
import type { Travel } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement } from "react"

import {
  campDays,
  dayOfCamp,
  dayOfJourney,
  itinerary,
  phaseAt,
  timeUntil,
  type Itinerary,
  type JourneyPhase,
} from "../../../model/Journey"

import "./CountdownCard.css"

/**
 * How one day of the trip is painted in the bar: dashed before the journey has begun,
 * filled once behind the contingent, today standing taller, and the homecoming day on
 * the end – checked off once it is reached.
 */
type Segment = "planned" | "travel" | "camp" | "today" | "remaining" | "home" | "home-done"

/**
 * The days of the bar, painted for a phase. The last day is always the homecoming day;
 * the rest are read against where the contingent stands.
 * @param phase The phase the moment falls in.
 * @param journeyDay Which day of the journey the moment is.
 * @param trip Whose journey.
 * @returns One segment per day, in journey order.
 */
function segmentsIn(phase: JourneyPhase, journeyDay: number, trip: Itinerary): readonly Segment[] {
  if (phase === "home") {
    return [...paint("travel", trip.travelDays), ...paint("camp", campDays), "home-done"]
  }
  if (phase === "ahead") {
    return [...paint("planned", trip.travelDays), ...paint("remaining", campDays), "home"]
  }
  return [
    ...Array.from({ length: trip.journeyDays - 1 }, (unused, index): Segment => {
      const day = index + 1
      if (day === journeyDay) {
        return "today"
      }
      if (day > journeyDay) {
        return "remaining"
      }
      return day <= trip.travelDays ? "travel" : "camp"
    }),
    "home",
  ]
}

function paint(segment: Segment, count: number): readonly Segment[] {
  return Array.from({ length: count }, () => segment)
}

/**
 * One figure in the count: the number, and the unit it counts.
 */
interface Figure {
  readonly unit: string
  readonly value: number
}

/**
 * The count beside the heading: a leading label, and the figures after it.
 */
interface Count {
  readonly figures: readonly Figure[]
  readonly label: string
}

/**
 * The one count for a moment: down to the journey's first day while it is ahead, and
 * through the days once it has begun. None once everyone is home, when the line is the
 * thank-you instead.
 * @param now The moment the card is drawn for.
 * @param phase The phase the moment falls in.
 * @param trip Whose journey.
 * @param hasSeconds Whether the countdown runs to the second.
 * @returns The count, or nothing once the journey is over.
 */
function countFor(
  now: Date,
  phase: JourneyPhase,
  trip: Itinerary,
  hasSeconds: boolean,
): Count | undefined {
  switch (phase) {
    case "ahead": {
      // Down to the minute or the second however far off the day is – the figures
      // moving are what make the line a countdown rather than a date.
      const left = timeUntil(now, trip.departure)
      return {
        figures: [
          { unit: "d", value: left.days },
          { unit: "tim", value: left.hours },
          { unit: "min", value: left.minutes },
          ...(hasSeconds ? [{ unit: "sek", value: left.seconds }] : []),
        ],
        label: trip.travelDays > 0 ? "Avresa om" : "Lägret om",
      }
    }
    case "traveling": {
      return {
        figures: [{ unit: `av ${String(trip.journeyDays)}`, value: dayOfJourney(now, trip) }],
        label: "Resan · dag",
      }
    }
    case "camping": {
      return {
        figures: [{ unit: `av ${String(campDays)}`, value: dayOfCamp(now) }],
        label: "Lägret · dag",
      }
    }
    case "home": {
      return undefined
    }
  }
}

interface StatusProps {
  /**
   * The moment the line is drawn for.
   */
  readonly now: Date
  /**
   * The phase the moment falls in.
   */
  readonly phase: JourneyPhase
  /**
   * Whether the countdown runs to the second.
   */
  readonly seconds: boolean
  /**
   * Whose journey.
   */
  readonly trip: Itinerary
}

/**
 * The line beside the heading for one moment: the count while something is ahead or
 * under way, and the thank-you as an all-clear badge once everyone is home. Phrasing
 * content, because the card draws its aside inside a `span`.
 * @param props The moment, the phase it falls in, and the trip.
 * @returns The line.
 */
function Status(props: StatusProps): ReactElement {
  const count = countFor(props.now, props.phase, props.trip, props.seconds)
  if (count === undefined) {
    return <Chip tone="positive">Jamboreen är över – tack för i år!</Chip>
  }

  return (
    // The literal spaces keep the text reading "Avresa om 305 d 4 tim 12 min" when
    // copied or spoken; a flex row never renders a whitespace-only item, so the visual
    // spacing stays the stylesheet's.
    <span className="countdown-status">
      {count.label}{" "}
      {count.figures.map((figure) => (
        <span key={figure.unit}>
          <b>{figure.value}</b> <small>{figure.unit}</small>{" "}
        </span>
      ))}
    </span>
  )
}

/**
 * The road to the camp, as the legend names it.
 */
interface Road {
  readonly dates: string
  readonly route: string
}

/**
 * The roads the contingent travels together. Traveling on one's own has none – the
 * journey is the camp.
 */
const roads: Readonly<Partial<Record<Travel, Road>>> = {
  // Three days of the bar is too narrow for the rundresa's form of the wording, so this
  // road names only where it goes, and the camp leg beside it carries the year.
  direktresa: { dates: "26–28 juli", route: "Till Olsztyn" },
  rundresa: { dates: "Resa · 21–28 juli 2027", route: "Sverige → Lettland → Litauen" },
}

interface LegendProps {
  /**
   * The moment the legend is drawn for.
   */
  readonly now: Date
  /**
   * The phase the moment falls in.
   */
  readonly phase: JourneyPhase
  /**
   * How the person travels, which decides the road drawn before the camp, if any.
   */
  readonly travel: Travel | undefined
}

/**
 * The legs under the bar, each as wide as the days it spans. The camp is the journey's
 * destination and always wears the leading tone; the road there is only drawn for those
 * who travel it with the contingent, and leads beside the camp while it is what the
 * count runs to or through – muted once it is behind the contingent.
 * @param props The moment, the phase it falls in, and how the person travels.
 * @returns The legend.
 */
function Legend(props: LegendProps): ReactElement {
  const isHome = props.phase === "home"
  const road = props.travel === undefined ? undefined : roads[props.travel]
  const campDetail =
    props.phase === "camping"
      ? `Dag ${String(dayOfCamp(props.now))} av ${String(campDays)}`
      : "29 juli – 9 augusti 2027"

  return (
    <div className="countdown-legend">
      {road === undefined ? null : (
        <span
          className={`is-travel-leg is-${String(props.travel)} ${
            props.phase === "ahead" || props.phase === "traveling" ? "is-primary" : "is-muted"
          }`}
        >
          <strong>{road.route}</strong>
          <small>{road.dates}</small>
        </span>
      )}
      <span className="is-camp-leg is-primary">
        <strong>World Scout Jamboree · Gdańsk</strong>
        <small>{campDetail}</small>
      </span>
      <span className={`is-end ${isHome ? "is-success" : "is-muted"}`}>
        <strong>{isHome ? "Hemma" : "Hem"}</strong>
        <small>10/8</small>
      </span>
    </div>
  )
}

export interface CountdownCardProps {
  /**
   * The moment the card is drawn for. Handed in rather than read from the clock, so
   * the card renders the same way in a story as it does in August 2027 – the widget
   * around it is what keeps it on the clock.
   */
  readonly now: Date
  /**
   * Whether the countdown runs to the second rather than the minute. Off by default;
   * the widget turns it on in the wide layout for everybody who has not asked for
   * reduced motion, and hands in a moment that moves as often.
   */
  readonly seconds?: boolean
  /**
   * How the person travels. The rundresa and the direktresa each count down to their
   * own departure, and the bar walks their road; traveling on one's own, or a travel
   * choice nobody knows, makes the journey the camp, and everything counts to the day
   * the contingent reaches it.
   */
  readonly travel?: Travel | undefined
}

/**
 * Where the contingent is on the journey to Gdańsk, drawn for one moment.
 *
 * The line beside the heading counts down to the journey's first day, counts through
 * the days once it has begun, and closes with a thank-you once everyone is home. The
 * bar walks the trip day by day, the legend names each leg at the width its days
 * occupy, and while the dates are still ahead the card says they are not yet the
 * person's own.
 *
 * @param props The moment, how the person travels, and how fine the countdown runs.
 * @returns The card.
 */
export function CountdownCard(props: CountdownCardProps): ReactElement {
  const trip = itinerary(props.travel)
  const phase = phaseAt(props.now, trip)
  const journeyDay = dayOfJourney(props.now, trip)

  return (
    <Card
      aside={<Status now={props.now} phase={phase} seconds={props.seconds === true} trip={trip} />}
      title="Resan"
    >
      {/* Decoration under the count: the same journey the words already tell. */}
      <div aria-hidden="true" className="countdown-bar">
        {segmentsIn(phase, journeyDay, trip).map((segment, index) => (
          // Position is the identity: segment n is day n of the fixed journey.
          <span key={index} className={`is-${segment}`}>
            {segment === "home-done" ? "✓" : null}
          </span>
        ))}
      </div>
      <Legend now={props.now} phase={phase} travel={props.travel} />
      {phase === "home" ? null : (
        // The dates above are the contingent's plan, not yet anyone's own booking; once
        // everyone is home they are history, and the caveat stands down.
        <p className="countdown-caveat">
          Exakta datum och tider för just <b>dig</b> och <b>din avdelning</b> visas inte här än.
        </p>
      )}
    </Card>
  )
}
