import { describe, expect, it } from "vitest"

import type { Case } from "./Case"
import { isWaiting, quietDaysAt, standingOf } from "./Waiting"

const opened: Case = {
  aboutMemberNos: ["1300035"],
  createdAt: new Date("2026-11-01T10:00:00+01:00"),
  creatorMemberNo: "1200001",
  extraAccess: [],
  id: "1",
  isClosed: false,
  secrecyLevel: 3,
  title: "Feber",
  troop: "1",
  type: "hälsa",
}

const people = new Map([["1200002", { memberNo: "1200002", name: "Henrik Holm" }]])

const taken: Case = { ...opened, assigneeMemberNo: "1200002" }

/**
 * A moment some days after the case was opened.
 * @param days How many days after.
 * @returns The moment.
 */
function after(days: number): Date {
  return new Date(opened.createdAt.getTime() + days * 24 * 60 * 60 * 1000)
}

describe("how long a case may go quiet", () => {
  it("is a week at home and a day from the first departure", () => {
    expect(quietDaysAt(new Date("2027-07-20T23:59:00+02:00"))).toBe(7)
    expect(quietDaysAt(new Date("2027-07-21T00:00:00+02:00"))).toBe(1)
    expect(quietDaysAt(new Date("2027-08-05T12:00:00+02:00"))).toBe(1)
  })
})

describe("whether a case waits for someone", () => {
  it("waits while nobody follows it up, however new", () => {
    expect(isWaiting(opened, after(0))).toBe(true)
  })

  it("waits once whoever follows it up has let it go quiet for the period", () => {
    expect(isWaiting(taken, after(6))).toBe(false)
    expect(isWaiting(taken, after(7))).toBe(true)
  })

  it("counts from the newest note rather than the opening", () => {
    const written: Case = { ...taken, latestNoteAt: after(5) }
    expect(isWaiting(written, after(7))).toBe(false)
  })

  it("never waits once closed", () => {
    expect(isWaiting({ ...opened, isClosed: true }, after(30))).toBe(false)
  })
})

describe("saying where an open case stands", () => {
  it("marks why it waits", () => {
    expect(standingOf(opened, after(0), people, "1200001")).toEqual({ mark: "Ingen ansvarig" })
    expect(standingOf(taken, after(8), people, "1200001")).toEqual({
      line: "Ansvarig: Henrik Holm",
      mark: "Sen",
    })
  })

  it("names who follows it up, and leaves it out for the reader's own", () => {
    expect(standingOf(taken, after(1), people, "1200001")).toEqual({
      line: "Ansvarig: Henrik Holm",
    })
    expect(standingOf(taken, after(1), people, "1200002")).toEqual({})
    expect(standingOf(taken, after(8), people, "1200002")).toEqual({ mark: "Sen" })
  })

  it("says nothing of a closed case", () => {
    expect(standingOf({ ...opened, isClosed: true }, after(1), people, "1200001")).toEqual({})
  })
})
