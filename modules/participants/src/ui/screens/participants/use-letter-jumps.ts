import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { fullName, type Participant } from "../../../model/Participant"

/**
 * How long the list may keep changing before the stops follow. Narrowing recomputes
 * the stops on every settled keystroke, and an outline that reshuffles mid-word reads
 * as flicker – so the stops trail the list by a beat.
 */
const settleMs = 250

/**
 * How long a picked stop outlives the scroll it caused. The pick's own scroll reports
 * back within this; anything later is the reader moving, and hands the marker back.
 */
const holdMs = 600

/**
 * How many stops the outline column has room for on a given screen: roughly what fits
 * under the chrome at one entry's height, never more than ten – past that the column
 * stops reading as an outline and starts reading as a list of its own.
 * @param viewportHeight The window's inner height, in pixels.
 * @returns The largest number of stops worth offering, at least three.
 */
export function stopBudget(viewportHeight: number): number {
  const aboveAndBelow = 260
  const entryHeight = 40
  return Math.min(10, Math.max(3, Math.floor((viewportHeight - aboveAndBelow) / entryHeight)))
}

/**
 * The Swedish alphabet, in its own order – å, ä, and ö are letters of their own at
 * the end, never variants of a and o. The partition below divides this, so a stop's
 * label always reads as a range of the alphabet rather than a roll call of whoever
 * happens to be present.
 */
// eslint-disable-next-line no-secrets/no-secrets -- the alphabet, not a credential
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ"

/**
 * Where in the alphabet a name files. The Swedish letters are checked before the
 * diacritics are folded, because Åsa files under Å while Édith files under E – and a
 * name opening with anything else files where the list begins.
 * @param name The full name, as the list sorts it.
 * @returns The letter's position in the alphabet.
 */
function positionOf(name: string): number {
  const first = name.trim().charAt(0).toLocaleUpperCase("sv-SE")
  const swedish = alphabet.indexOf(first)
  if (swedish !== -1) {
    return swedish
  }
  const folded = first.normalize("NFD").replaceAll(/\p{M}/gu, "")
  const position = alphabet.indexOf(folded)
  return Math.max(0, position)
}

/**
 * One offered stop: its label – a range of the alphabet – and the first row it points
 * at.
 */
export interface LetterStop {
  readonly firstIndex: number
  readonly label: string
}

/**
 * How many stops a list is worth: more people, more stops, on a square-root curve –
 * a unit's forty gets a handful, the contingent's thousands the whole budget.
 * @param peopleCount How many people the list shows.
 * @param budget The most the screen has room for – see `stopBudget`.
 * @returns The number of alphabet ranges to offer.
 */
export function stopCount(peopleCount: number, budget: number): number {
  const bySize = Math.ceil(Math.sqrt(peopleCount))
  return Math.min(budget, Math.max(2, bySize))
}

/**
 * The stops a list of people offers: the alphabet divided into `count` near-equal
 * ranges, each labeled by its span – "A–D" even when nobody files under D – and
 * pointing at its first row. A range nobody files under is left out rather than
 * offered as a stop that goes nowhere. Pure, so the boundary arithmetic is testable
 * without a DOM.
 * @param people The people, already in reading order.
 * @param count How many ranges to divide the alphabet into – see `stopCount`.
 * @returns The stops, empty for an empty list.
 */
export function letterStops(people: readonly Participant[], count: number): readonly LetterStop[] {
  if (people.length === 0 || count < 1) {
    return []
  }

  // The first row filed under each alphabet position – the list is collated, so a
  // forward walk records each position's first person.
  const firstAt = new Map<number, number>()
  for (const [index, person] of people.entries()) {
    const position = positionOf(fullName(person))
    if (!firstAt.has(position)) {
      firstAt.set(position, index)
    }
  }

  /**
   * The first row filed at or after a position, or undefined past the last one.
   * @param from The position a range begins at.
   * @returns The row, or undefined when nobody files there or later.
   */
  const firstFrom = (from: number): number | undefined => {
    for (let position = from; position < alphabet.length; position += 1) {
      const row = firstAt.get(position)
      if (row !== undefined) {
        return row
      }
    }
    return undefined
  }

  const stops: LetterStop[] = []
  for (let range = 0; range < count; range += 1) {
    const from = Math.floor((alphabet.length * range) / count)
    const to = Math.floor((alphabet.length * (range + 1)) / count) - 1
    const firstIndex = firstFrom(from)
    const next = to + 1 < alphabet.length ? firstFrom(to + 1) : undefined
    // A range with nobody in it – its first row at or after `from` lies beyond `to` –
    // is a stop that goes nowhere, so it is not offered.
    if (firstIndex === undefined || firstIndex === next) {
      continue
    }
    const label =
      from === to
        ? (alphabet.at(from) ?? "")
        : `${alphabet.at(from) ?? ""}–${alphabet.at(to) ?? ""}`
    stops.push({ firstIndex, label })
  }
  return stops
}

/**
 * Whether two runs of stops offer the same thing – the guard that keeps a settled
 * recompute from republishing an unchanged outline.
 * @param left One run of stops.
 * @param right The other.
 * @returns True when every stop matches.
 */
function areSameStops(left: readonly LetterStop[], right: readonly LetterStop[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (stop, index) =>
        stop.label === right.at(index)?.label && stop.firstIndex === right.at(index)?.firstIndex,
    )
  )
}

/**
 * What the screen wires between the outline's jumps and the virtual list.
 */
export interface LetterJumps {
  /**
   * The stop the reader is at, by index into `entries`.
   */
  readonly current: number
  /**
   * The offered stops' labels, in list order.
   */
  readonly entries: readonly string[]
  /**
   * Where the reader is, from the list's own report of its topmost visible row.
   */
  readonly onFirstVisible: (index: number) => void
  /**
   * Scrolls the list to the chosen stop's first row.
   */
  readonly onJump: (index: number) => void
  /**
   * Receives the list's jump control – hand it to `PeopleList`.
   */
  readonly registerJump: (jump: (index: number) => void) => void
}

/**
 * The letter jumps over a name-sorted list: the stops the outline offers – as many as
 * this screen has room for – which one the reader is at, and the wiring that scrolls
 * the virtual list when one is chosen. The stops trail a changing list by a beat, so
 * typing narrows the rows at once and the outline follows when the word settles.
 * @param people The people the list shows, already narrowed and in reading order.
 * @returns The stops and their wiring.
 */
export function useLetterJumps(people: readonly Participant[]): LetterJumps {
  // Read once per mount: a mid-session resize is rare, and the next visit recomputes.
  // One place in the budget is the top stop's, standing outside the alphabet.
  const [budget] = useState(() => stopBudget(window.innerHeight))
  const computed = useMemo(
    () => letterStops(people, stopCount(people.length, budget - 1)),
    [budget, people],
  )
  const [stops, setStops] = useState(computed)
  const jump = useRef<((index: number) => void) | undefined>(undefined)
  const [firstVisible, setFirstVisible] = useState(0)
  // The stop the reader picked, held as current even when the list had nowhere left to
  // scroll – a press that changes nothing on screen reads as a press that did not work.
  // The pick's own scroll lands within the hold; the first scroll after it hands the
  // marker back to the list's own report.
  const [chosen, setChosen] = useState<number | undefined>(undefined)
  const chosenAt = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setStops((previous) => (areSameStops(previous, computed) ? previous : computed))
    }, settleMs)
    return () => {
      clearTimeout(timer)
    }
  }, [computed])

  // A list that had nothing and got its answer shows its stops at once – the settled
  // state catches up when the timer lands; only a list reshaping under a search waits
  // the beat out.
  const shown = stops.length === 0 ? computed : stops

  // The top stop leads back above the rows – to the search and the controls – and is
  // offered only when there are letter stops to stand over.
  const entries = useMemo(
    () => (shown.length === 0 ? [] : ["Överst", ...shown.map((stop) => stop.label)]),
    [shown],
  )
  const registerJump = useCallback((control: (index: number) => void) => {
    jump.current = control
  }, [])
  const onJump = useCallback(
    (index: number) => {
      // Entry 0 is the top stop; the letter stops sit one past their own index. The
      // list's control reads a negative row as "the very top".
      const target = index === 0 ? -1 : shown.at(index - 1)?.firstIndex
      if (target !== undefined) {
        chosenAt.current = performance.now()
        setChosen(index)
        jump.current?.(target)
      }
    },
    [shown],
  )

  const onFirstVisible = useCallback((index: number) => {
    setFirstVisible(index)
    if (performance.now() - chosenAt.current > holdMs) {
      setChosen(undefined)
    }
  }, [])

  // The reader's stop: their own pick while it holds, else the last letter stop whose
  // first row has scrolled past the top – or the top stop while the controls above
  // the rows are still in view, which the list reports as a negative row.
  let current = 0
  for (const [index, stop] of shown.entries()) {
    if (firstVisible >= 0 && stop.firstIndex <= firstVisible) {
      current = index + 1
    }
  }
  if (chosen !== undefined && chosen < entries.length) {
    current = chosen
  }

  return { current, entries, onFirstVisible, onJump, registerJump }
}
