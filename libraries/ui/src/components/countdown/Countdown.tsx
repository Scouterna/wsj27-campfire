import { useEffect, useState, type ReactElement } from "react"

import "./Countdown.css"

/**
 * What remains on the clock, in whole units.
 */
interface Remaining {
  readonly days: number
  readonly hours: number
  readonly minutes: number
  readonly seconds: number
}

/**
 * What remains until a moment, split for the clock. A moment already passed remains
 * as all zeros rather than negatives, so the clock never counts backwards.
 * @param at The moment counted down to.
 * @param now The moment counting from.
 * @returns The remaining days, hours, minutes, and seconds.
 */
function remainingUntil(at: Date, now: Date): Remaining {
  const left = Math.max(0, at.getTime() - now.getTime())
  const seconds = Math.floor(left / 1000)
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  }
}

export interface CountdownProps {
  /**
   * The moment counted down to.
   */
  readonly at: Date
  /**
   * A quiet line under the clock saying what the moment brings. Left out when the
   * clock stands alone.
   */
  readonly hint?: string
  /**
   * The clock's accessible name. The ticking itself is deliberately silent to
   * assistive technology – a timer that announces every second talks over everything
   * else – so the name and the words around the clock carry the moment instead.
   */
  readonly label: string
  /**
   * The line over the clock naming the moment – a date, an occasion.
   */
  readonly overline?: string
}

/**
 * A countdown to a moment: days, hours, minutes, and seconds in four tiles on the
 * theme's color, ticking once a second, with a line over the clock and a hint under
 * it. It only ever counts – what happens at zero is the caller's, and a passed moment
 * shows a standing zero rather than negatives.
 *
 * @param props The moment, the words around the clock, and its accessible name.
 * @returns The countdown.
 */
export function Countdown(props: CountdownProps): ReactElement {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])

  const left = remainingUntil(props.at, now)

  return (
    <section className="countdown" aria-label={props.label}>
      {props.overline === undefined ? null : <p className="countdown-overline">{props.overline}</p>}
      <div className="countdown-clock" aria-hidden="true">
        {[
          { label: "dagar", value: left.days },
          { label: "timmar", value: left.hours },
          { label: "minuter", value: left.minutes },
          { label: "sekunder", value: left.seconds },
        ].map((figure) => (
          <div className="countdown-figure" key={figure.label}>
            {/* Zero-padded, so the clock's width holds still while it ticks. */}
            <span className="countdown-number">{String(figure.value).padStart(2, "0")}</span>
            <span className="countdown-unit">{figure.label}</span>
          </div>
        ))}
      </div>
      {props.hint === undefined ? null : <p className="countdown-hint">{props.hint}</p>}
    </section>
  )
}
