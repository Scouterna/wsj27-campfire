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

const preTrip = itinerary(true)
const campOnly = itinerary(false)

describe("the journey's fixed shape", () => {
  it("is 21 days door to door with the pre-trip, 12 of them at the jamboree", () => {
    expect(preTrip.travelDays).toBe(8)
    expect(preTrip.journeyDays).toBe(21)
    expect(campDays).toBe(12)
  })

  it("is the camp and the way home without the pre-trip", () => {
    expect(campOnly.travelDays).toBe(0)
    expect(campOnly.journeyDays).toBe(13)
    expect(campOnly.departure).toEqual(new Date(2027, 6, 29))
  })
})

describe("which phase a moment falls in, with the pre-trip", () => {
  it("is ahead until the last minute before the departure day", () => {
    expect(phaseAt(new Date(2026, 8, 3), preTrip)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 20, 23, 59), preTrip)).toBe("ahead")
  })

  it("is traveling from the moment the departure day starts", () => {
    expect(phaseAt(new Date(2027, 6, 21, 0, 0), preTrip)).toBe("traveling")
    expect(phaseAt(new Date(2027, 6, 28), preTrip)).toBe("traveling")
  })

  it("is camping from the contingent's arrival day to its last", () => {
    expect(phaseAt(new Date(2027, 6, 29), preTrip)).toBe("camping")
    expect(phaseAt(new Date(2027, 7, 9, 23, 59), preTrip)).toBe("camping")
  })

  it("is home from the homecoming day on", () => {
    expect(phaseAt(new Date(2027, 7, 10), preTrip)).toBe("home")
    expect(phaseAt(new Date(2027, 7, 10, 17, 45), preTrip)).toBe("home")
    expect(phaseAt(new Date(2031, 0, 1), preTrip)).toBe("home")
  })
})

describe("which phase a moment falls in, without the pre-trip", () => {
  it("counts down to the camp instead of the buses", () => {
    expect(phaseAt(new Date(2026, 8, 3), campOnly)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 20, 23, 59), campOnly)).toBe("ahead")
  })

  it("is never traveling – the pre-trip's days are somebody else's", () => {
    expect(phaseAt(new Date(2027, 6, 21), campOnly)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 28, 23, 59), campOnly)).toBe("ahead")
    expect(phaseAt(new Date(2027, 6, 29), campOnly)).toBe("camping")
  })
})

describe("the countdown", () => {
  it("counts days, hours, and minutes to departure", () => {
    const left = timeUntil(new Date(2027, 6, 19, 21, 29, 45), preTrip.departure)
    expect(left).toEqual({ days: 1, hours: 2, minutes: 30, seconds: 15 })
  })

  it("counts to the camp without the pre-trip", () => {
    const left = timeUntil(new Date(2027, 6, 27, 12, 0), campOnly.departure)
    expect(left).toEqual({ days: 1, hours: 12, minutes: 0, seconds: 0 })
  })

  it("counts to the camp during the pre-trip's own days", () => {
    const left = timeUntil(new Date(2027, 6, 27), campStart)
    expect(left.days).toBe(2)
  })

  it("has nothing left once the moment has passed", () => {
    expect(timeUntil(new Date(2027, 6, 22), preTrip.departure)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })
})

describe("day numbering", () => {
  it("counts the departure day as journey day one", () => {
    expect(dayOfJourney(new Date(2027, 6, 21, 15, 0), preTrip)).toBe(1)
    expect(dayOfJourney(new Date(2027, 7, 10), preTrip)).toBe(21)
  })

  it("counts the arrival day as journey day one without the pre-trip", () => {
    expect(dayOfJourney(new Date(2027, 6, 29), campOnly)).toBe(1)
    expect(dayOfJourney(new Date(2027, 7, 10), campOnly)).toBe(13)
  })

  it("counts the arrival day as camp day one", () => {
    expect(dayOfCamp(new Date(2027, 6, 29))).toBe(1)
    expect(dayOfCamp(new Date(2027, 7, 9))).toBe(12)
  })

  it("names the nearest end for a moment outside the journey", () => {
    expect(dayOfJourney(new Date(2026, 8, 18), preTrip)).toBe(1)
    expect(dayOfJourney(new Date(2031, 0, 1), preTrip)).toBe(21)
    expect(dayOfCamp(new Date(2027, 6, 21))).toBe(1)
    expect(dayOfCamp(new Date(2027, 7, 10))).toBe(12)
  })

  it("ignores the time of day when counting days between dates", () => {
    expect(daysBetween(new Date(2027, 6, 21, 23, 59), new Date(2027, 6, 22, 0, 1))).toBe(1)
  })
})
