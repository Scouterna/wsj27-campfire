import { describe, expect, it } from "vitest"

import { locate, positionAt, route, whereabouts, withDelays, type ItineraryItem } from "./Itinerary"

const item = (
  id: string,
  kind: ItineraryItem["kind"],
  start: string,
  end: string,
): ItineraryItem => ({
  end: new Date(end),
  id,
  kind,
  notes: [],
  plannedStart: new Date(start),
  start: new Date(start),
  title: id,
  units: ["avdelning-1"],
})

const items = [
  item("bus", "travel", "2027-07-21T06:00:00Z", "2027-07-21T15:00:00Z"),
  item("ferry", "overnight", "2027-07-21T20:00:00Z", "2027-07-22T05:00:00Z"),
  item("hike", "activity", "2027-07-22T07:00:00Z", "2027-07-22T15:00:00Z"),
]

describe("whereabouts", () => {
  it("finds what covers the moment and tonight's bed", () => {
    const at = whereabouts(items, new Date("2027-07-21T10:00:00Z"))
    expect(at.doing.map((doing) => doing.id)).toStrictEqual(["bus"])
    expect(at.sleeping?.id).toBe("ferry")
    expect(at.next?.id).toBe("hike")
  })

  it("is asleep inside a night, with nothing else going on", () => {
    const at = whereabouts(items, new Date("2027-07-22T01:00:00Z"))
    expect(at.doing).toStrictEqual([])
    expect(at.sleeping?.id).toBe("ferry")
  })

  it("treats an item's end as outside it", () => {
    const at = whereabouts(items, new Date("2027-07-21T15:00:00Z"))
    expect(at.doing).toStrictEqual([])
  })

  it("has no bed more than a day ahead", () => {
    const at = whereabouts(items, new Date("2027-07-20T10:00:00Z"))
    expect(at.sleeping).toBeUndefined()
    expect(at.next?.id).toBe("bus")
  })
})

describe("positionAt", () => {
  const riga = {
    coordinates: { latitude: 56, longitude: 24 },
    name: "Riga",
    timeZone: "Europe/Riga",
  }
  const vilnius = {
    coordinates: { latitude: 54, longitude: 26 },
    name: "Vilnius",
    timeZone: "Europe/Vilnius",
  }
  const trip: readonly ItineraryItem[] = [
    { ...item("night", "overnight", "2027-07-24T18:00:00Z", "2027-07-25T04:00:00Z"), place: riga },
    {
      ...item("bus", "travel", "2027-07-25T06:00:00Z", "2027-07-25T10:00:00Z"),
      from: riga,
      to: vilnius,
    },
  ]

  it("places a moving unit along the line between the ends", () => {
    expect(positionAt(trip, new Date("2027-07-25T08:00:00Z"))).toStrictEqual({
      isMoving: true,
      latitude: 55,
      longitude: 25,
    })
  })

  it("keeps a unit at the last place it reached between items", () => {
    expect(positionAt(trip, new Date("2027-07-25T05:00:00Z"))).toMatchObject(riga.coordinates)
    expect(positionAt(trip, new Date("2027-07-26T05:00:00Z"))).toMatchObject(vilnius.coordinates)
  })

  it("starts a unit at its first place before the journey", () => {
    expect(positionAt(trip, new Date("2027-07-01T00:00:00Z"))).toMatchObject(riga.coordinates)
  })

  it("draws the route without repeating a place back to back", () => {
    expect(route(trip).map((point) => point.latitude)).toStrictEqual([56, 54])
  })
})

describe("withDelays", () => {
  it("moves the items a delay names and keeps when they were planned", () => {
    const [bus, night] = withDelays(items, [
      {
        delayMinutes: 90,
        id: "late",
        items: ["bus"],
        kind: "delay",
        posted: new Date(),
        title: "Sen",
        units: [],
      },
    ])
    expect(bus?.start.toISOString()).toBe("2027-07-21T07:30:00.000Z")
    expect(bus?.plannedStart.toISOString()).toBe("2027-07-21T06:00:00.000Z")
    expect(bus?.delayMinutes).toBe(90)
    expect(night?.delayMinutes).toBeUndefined()
  })
})

describe("locate", () => {
  const riga = {
    coordinates: { latitude: 56, longitude: 24 },
    name: "Riga",
    timeZone: "Europe/Riga",
  }
  const vilnius = { city: "Vilnius", name: "Vilnius scoutcenter", timeZone: "Europe/Vilnius" }
  const trip: readonly ItineraryItem[] = [
    { ...item("night", "overnight", "2027-07-24T18:00:00Z", "2027-07-25T04:00:00Z"), place: riga },
    {
      ...item("bus", "travel", "2027-07-25T06:00:00Z", "2027-07-25T10:00:00Z"),
      from: riga,
      to: vilnius,
    },
  ]

  it("names the place a unit sleeps in", () => {
    expect(locate(trip, new Date("2027-07-24T22:00:00Z"))).toMatchObject({
      doing: "night",
      label: "Riga",
    })
  })

  it("names the road a unit is on", () => {
    expect(locate(trip, new Date("2027-07-25T08:00:00Z")).label).toBe("På väg: Riga → Vilnius")
  })

  it("keeps a unit home before and after its journey", () => {
    expect(locate(trip, new Date("2027-07-01T00:00:00Z")).label).toBe("Inte avrest")
    expect(locate(trip, new Date("2027-08-01T00:00:00Z")).label).toBe("Hemma")
  })
})
