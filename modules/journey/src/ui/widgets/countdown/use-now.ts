import { useEffect, useState } from "react"

/**
 * The current moment, refreshed on the clock's own boundaries – on the second, or on
 * the minute – so a figure turns over when the wall clock does. While paused nothing
 * is scheduled at all, and resuming catches up at once rather than at the next step.
 * @param everyMilliseconds How often the moment moves – the finest step the caller draws.
 * @param isRunning Whether anybody is looking. A paused clock costs no wake-ups.
 * @returns The moment, re-rendering the caller as it moves.
 */
export function useNow(everyMilliseconds: number, isRunning: boolean): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!isRunning) {
      return
    }

    let timer: ReturnType<typeof setTimeout>
    const tick = (): void => {
      setNow(new Date())
      timer = setTimeout(tick, everyMilliseconds - (Date.now() % everyMilliseconds))
    }
    timer = setTimeout(tick, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [everyMilliseconds, isRunning])

  return now
}
