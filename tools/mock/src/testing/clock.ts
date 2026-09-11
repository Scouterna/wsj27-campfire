/**
 * A clock a test moves by hand, so a lifetime running out is a fact rather than a wait.
 */
export interface Clock {
  /**
   * Moves the clock forward.
   */
  readonly advance: (milliseconds: number) => void
  /**
   * The time, in milliseconds.
   */
  readonly now: () => number
}

/**
 * Makes a clock that stands still until it is moved.
 * @param start Where it starts, in milliseconds – the jamboree's opening morning by default.
 * @returns The clock.
 */
export function clock(start = Date.UTC(2027, 6, 30, 8)): Clock {
  let time = start
  return {
    advance: (milliseconds) => {
      time += milliseconds
    },
    now: () => time,
  }
}
