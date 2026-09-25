import { describe, expect, it } from "vitest"

import {
  campDays,
  campStart,
  dayOfCamp,
  dayOfJourney,
  daysBetween,
  itinerary,
  phaseAt,
  timeUntil,
} from "./Journey"

const rundresa = itinerary("rundresa")
const direktresa = itinerary("direktresa")
const campOnly = itinerary("egenResa")

describe("the journey's fixed shape", () => {
  it("is 21 days door to door on the rundresa, 12 of them at the jamboree", () => {
    expect(rundresa.departure).toEqual(new Date(2027, 6, 21))
    expect(rundresa.travelDays).toBe(8)
    expect(rundresa.journeyDays).toBe(21)
    expect(campDays).toBe(12)
  })

  it("is 16 days door to door on the direktresa, three of them on the road", () => {
    expect(direktresa.departure).toEqual(new Date(2027, 6, 26))
    expect(direktresa.travelDays).toBe(3)
    expect(direktresa.journeyDays).toBe(16)
  })

  it("is the camp and the way home for those who travel on their own", () => {
    expect(campOnly.travelDays).toBe(0)
    expect(campOnly.journeyDays).toBe(13)
    expect(campOnly.departure).toEqual(new Date(2027, 6, 29))
  })

  it("puts nobody on a bus when the travel choice is unknown", () => {
    expect(itinerary(undefined)).toEqual(campOnly)
  })
})

describe("which phase a moment falls in, on the rundresa", () => {
  it("is ahead until the last minute before the departure day", () => {
    expect(phaseAt(new Date(2026, 8, 3), rundresa)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 20, 23, 59), rundresa)).toBe("ahead")
  })

  it("is traveling from the moment the departure day starts", () => {
    expect(phaseAt(new Date(2027, 6, 21, 0, 0), rundresa)).toBe("traveling")
    expect(phaseAt(new Date(2027, 6, 28), rundresa)).toBe("traveling")
  })

  it("is camping from the contingent's arrival day to its last", () => {
    expect(phaseAt(new Date(2027, 6, 29), rundresa)).toBe("camping")
    expect(phaseAt(new Date(2027, 7, 9, 23, 59), rundresa)).toBe("camping")
  })

  it("is home from the homecoming day on", () => {
    expect(phaseAt(new Date(2027, 7, 10), rundresa)).toBe("home")
    expect(phaseAt(new Date(2027, 7, 10, 17, 45), rundresa)).toBe("home")
    expect(phaseAt(new Date(2031, 0, 1), rundresa)).toBe("home")
  })
})

describe("which phase a moment falls in, on the direktresa", () => {
  it("is ahead while the rundresa is already on the road", () => {
    expect(phaseAt(new Date(2027, 6, 21), direktresa)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 25, 23, 59), direktresa)).toBe("ahead")
  })

  it("is traveling from its own departure day until the camp", () => {
    expect(phaseAt(new Date(2027, 6, 26), direktresa)).toBe("traveling")
    expect(phaseAt(new Date(2027, 6, 28, 23, 59), direktresa)).toBe("traveling")
    expect(phaseAt(new Date(2027, 6, 29), direktresa)).toBe("camping")
  })

  it("is home from the homecoming day on", () => {
    expect(phaseAt(new Date(2027, 7, 9, 23, 59), direktresa)).toBe("camping")
    expect(phaseAt(new Date(2027, 7, 10), direktresa)).toBe("home")
  })
})

describe("which phase a moment falls in, traveling on one's own", () => {
  it("counts down to the camp instead of the buses", () => {
    expect(phaseAt(new Date(2026, 8, 3), campOnly)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 20, 23, 59), campOnly)).toBe("ahead")
  })

  it("is never traveling – the contingent's road days are somebody else's", () => {
    expect(phaseAt(new Date(2027, 6, 21), campOnly)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 28, 23, 59), campOnly)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 29), campOnly)).toBe("camping")
  })
})

describe("the countdown", () => {
  it("counts days, hours, and minutes to departure", () => {
    const left = timeUntil(new Date(2027, 6, 19, 21, 29, 45), rundresa.departure)
    expect(left).toEqual({ days: 1, hours: 2, minutes: 30, seconds: 15 })
  })

  it("counts to the direktresa's own departure", () => {
    const left = timeUntil(new Date(2027, 6, 24, 18, 0), direktresa.departure)
    expect(left).toEqual({ days: 1, hours: 6, minutes: 0, seconds: 0 })
  })

  it("counts to the camp for those who travel on their own", () => {
    const left = timeUntil(new Date(2027, 6, 27, 12, 0), campOnly.departure)
    expect(left).toEqual({ days: 1, hours: 12, minutes: 0, seconds: 0 })
  })

  it("counts to the camp during the road's own days", () => {
    const left = timeUntil(new Date(2027, 6, 27), campStart)
    expect(left.days).toBe(2)
  })

  it("has nothing left once the moment has passed", () => {
    expect(timeUntil(new Date(2027, 6, 22), rundresa.departure)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })
})

describe("day numbering", () => {
  it("counts the departure day as journey day one", () => {
    expect(dayOfJourney(new Date(2027, 6, 21, 15, 0), rundresa)).toBe(1)
    expect(dayOfJourney(new Date(2027, 7, 10), rundresa)).toBe(21)
  })

  it("counts the direktresa's departure day as its journey day one", () => {
    expect(dayOfJourney(new Date(2027, 6, 26, 8, 0), direktresa)).toBe(1)
    expect(dayOfJourney(new Date(2027, 6, 29), direktresa)).toBe(4)
    expect(dayOfJourney(new Date(2027, 7, 10), direktresa)).toBe(16)
  })

  it("counts the arrival day as journey day one for those who travel on their own", () => {
    expect(dayOfJourney(new Date(2027, 6, 29), campOnly)).toBe(1)
    expect(dayOfJourney(new Date(2027, 7, 10), campOnly)).toBe(13)
  })

  it("counts the arrival day as camp day one", () => {
    expect(dayOfCamp(new Date(2027, 6, 29))).toBe(1)
    expect(dayOfCamp(new Date(2027, 7, 9))).toBe(12)
  })

  it("names the nearest end for a moment outside the journey", () => {
    expect(dayOfJourney(new Date(2026, 8, 18), rundresa)).toBe(1)
    expect(dayOfJourney(new Date(2031, 0, 1), rundresa)).toBe(21)
    expect(dayOfCamp(new Date(2027, 6, 21))).toBe(1)
    expect(dayOfCamp(new Date(2027, 7, 10))).toBe(12)
  })

  it("ignores the time of day when counting days between dates", () => {
    expect(daysBetween(new Date(2027, 6, 21, 23, 59), new Date(2027, 6, 22, 0, 1))).toBe(1)
  })
})
