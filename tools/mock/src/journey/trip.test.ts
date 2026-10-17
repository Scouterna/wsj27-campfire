import { afterEach, describe, expect, it, vi } from "vitest"

import type { Tables } from "./airtable.ts"
import { journeyRoutes } from "./routes.ts"
import { tripPlan, type TripPlanJson } from "./trip.ts"

/**
 * A small trip base: two units on one route going home on different sailings, the IST on a
 * route of its own, a route nobody is on, a night sailing without an arrival, a day
 * sailing, a sailing with an arrival, one nobody is booked on, day rows for a city, a travel
 * day, and the camp, and an update naming a unit that has since been deleted.
 */
const tables: Tables = {
  Days: [
    { fields: { Date: "2027-07-22", Night: ["recP3"], Route: ["recR1"] }, id: "recD1" },
    {
      fields: {
        Activity: "Ankomst till lägret",
        "Activity kind": "Travel",
        "Activity place": ["recP4"],
        Date: "2027-07-23",
        Night: ["recP4"],
        Note: "Bussen går från hotellet.",
        Route: ["recR1"],
      },
      id: "recD2",
    },
    {
      fields: {
        Activity: "Öppningsceremoni",
        "Activity kind": "Gathering",
        "Activity place": ["recP4"],
        Date: "2027-07-24",
        Route: ["recR1"],
      },
      id: "recD3",
    },
    { fields: { Activity: "Utan datum", Route: ["recR2"] }, id: "recD4" },
    { fields: { Activity: "Fri dag", Date: "2027-07-25", Route: ["recR1"] }, id: "recD5" },
    { fields: { Date: "2027-07-25", Night: ["recP3"], Route: ["recR3"] }, id: "recD6" },
  ],
  Places: [
    { fields: { Kind: "Terminal", Name: "Nynäshamn" }, id: "recP1" },
    { fields: { Kind: "Terminal", Name: "Ventspils", "Time zone": "Europe/Riga" }, id: "recP2" },
    { fields: { Kind: "City", Name: "Riga", "Time zone": "Europe/Riga" }, id: "recP3" },
    {
      fields: { Kind: "Jamboree site", Name: "Lägret", "Time zone": "Europe/Warsaw" },
      id: "recP4",
    },
  ],
  Routes: [
    { fields: { Name: "Lettland 1", Travel: "Rundresa" }, id: "recR1" },
    { fields: { Name: "IST", Travel: "Rundresa" }, id: "recR2" },
    { fields: { Name: "Tom", Travel: "Rundresa" }, id: "recR3" },
  ],
  Sailings: [
    {
      fields: {
        Cabins: true,
        Departure: "2027-07-21T19:30:00.000Z",
        From: ["recP1"],
        Meals: "Frukost",
        Name: "Nynäshamn–Ventspils",
        To: ["recP2"],
      },
      id: "recS1",
    },
    {
      fields: { Departure: "2027-08-09T07:00:00.000Z", Name: "Dagfärjan", Note: "Tidig buss." },
      id: "recS2",
    },
    {
      fields: {
        Arrival: "2027-08-10T08:00:00.000Z",
        Cabins: true,
        Departure: "2027-08-09T16:00:00.000Z",
        Name: "Polferries",
      },
      id: "recS3",
    },
    { fields: { Departure: "2027-07-27T08:00:00.000Z", Name: "Reserven" }, id: "recS4" },
  ],
  Units: [
    {
      fields: {
        Home: ["recS3"],
        Kind: "Avdelning",
        Name: "Strömmingen",
        Number: 51,
        Out: ["recS1"],
        Route: ["recR1"],
      },
      id: "recU2",
    },
    {
      fields: {
        Home: ["recS2"],
        Kind: "Avdelning",
        Name: "Örnen",
        Number: 43,
        Out: ["recS1"],
        Route: ["recR1"],
      },
      id: "recU1",
    },
    { fields: { Kind: "IST", Name: "Skalbaggen", Number: 54, Route: ["recR2"] }, id: "recU3" },
  ],
  Updates: [
    {
      fields: {
        Posted: "2027-07-19T10:00:00.000Z",
        Routes: ["recR3"],
        Sailings: ["recS4"],
        Title: "Till ingen",
        Units: ["recGone"],
      },
      id: "recX3",
    },
    {
      fields: { Posted: "2027-07-20T10:00:00.000Z", Routes: ["recR2"], Title: "Till IST" },
      id: "recX2",
    },
    {
      fields: {
        "Delay minutes": 30,
        Kind: "Delay",
        Posted: "2027-07-21T10:00:00.000Z",
        Sailings: ["recS1"],
        Title: "Färjan är sen",
        Units: ["recU3"],
      },
      id: "recX1",
    },
  ],
}

/**
 * The items, by id.
 * @returns Every item the plan answers, keyed by its id.
 */
function itemsById(): ReadonlyMap<string, TripPlanJson["items"][number]> {
  return new Map(tripPlan(tables).items.map((item) => [item.id, item]))
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("the trip base's plan", () => {
  it("names units and the IST apart, units first, with their route", () => {
    expect(
      tripPlan(tables).units.map((unit) => [unit.key, unit.name, unit.travelGroup]),
    ).toStrictEqual([
      ["avdelning-43", "Avdelning 43 · Örnen", "Lettland 1"],
      ["avdelning-51", "Avdelning 51 · Strömmingen", "Lettland 1"],
      ["ist-54", "IST · Skalbaggen", "IST"],
    ])
  })

  it("gives each unit its own sailing home, while the route shares the sailing out", () => {
    const items = itemsById()
    expect(items.get("recS1")?.units).toStrictEqual(["avdelning-43", "avdelning-51"])
    expect(items.get("recS2")?.units).toStrictEqual(["avdelning-43"])
    expect(items.get("recS3")?.units).toStrictEqual(["avdelning-51"])
    expect(items.has("recS4")).toBe(false)
  })

  it("lands a cabin sailing without an arrival at seven the next morning, and sleeps aboard", () => {
    const items = itemsById()
    expect(items.get("recS1")).toMatchObject({
      description: "Måltider: Frukost. Hytter för alla.",
      // 07:00 in Riga, where the ferry lands.
      end: "2027-07-22T04:00:00.000Z",
      kind: "Travel",
      to: { name: "Ventspils" },
    })
    expect(items.get("recS1-night")).toMatchObject({
      end: "2027-07-22T04:00:00.000Z",
      kind: "Overnight",
      place: { name: "Nynäshamn–Ventspils", timeZone: "Europe/Stockholm" },
      start: "2027-07-21T19:30:00.000Z",
    })
  })

  it("keeps a day sailing without an arrival to its departure, and an arrival as given", () => {
    const items = itemsById()
    expect(items.get("recS2")).toMatchObject({
      description: "Inga hytter. Tidig buss.",
      end: "2027-08-09T07:00:00.000Z",
      start: "2027-08-09T07:00:00.000Z",
    })
    expect(items.has("recS2-night")).toBe(false)
    expect(items.get("recS3")?.end).toBe("2027-08-10T08:00:00.000Z")
  })

  it("spends a night at the route's place, on the place's own clocks", () => {
    expect(itemsById().get("recD1-night")).toMatchObject({
      end: "2027-07-23T04:00:00.000Z",
      place: { name: "Riga" },
      start: "2027-07-22T18:00:00.000Z",
      title: "Natt i Riga",
      units: ["avdelning-43", "avdelning-51"],
    })
  })

  it("sets a travel day off from where the route slept the night before", () => {
    const items = itemsById()
    expect(items.get("recD2-day")).toMatchObject({
      description: "Bussen går från hotellet.",
      end: "2027-07-23T15:00:00.000Z",
      from: { name: "Riga" },
      kind: "Travel",
      start: "2027-07-23T07:00:00.000Z",
      to: { name: "Lägret" },
    })
    expect(items.get("recD2-night")?.title).toBe("Natt på lägret")
    expect(items.get("recD3-day")).toMatchObject({ kind: "Gathering", place: { name: "Lägret" } })
  })

  it("reads a day without a kind or a place as a Swedish activity, and skips one without a date", () => {
    const items = itemsById()
    expect(items.get("recD5-day")).toMatchObject({
      kind: "Activity",
      start: "2027-07-25T07:00:00.000Z",
    })
    expect(items.has("recD4-day")).toBe(false)
    expect(items.get("recD6-night")?.units).toStrictEqual([])
  })

  it("answers the items in start order", () => {
    const starts = tripPlan(tables).items.map((item) => item.start)
    expect(starts).toStrictEqual(starts.toSorted((a, b) => a.localeCompare(b)))
  })

  it("moves a sailing and its night with a delay, and reaches everyone it names", () => {
    const [newest, older, oldest] = tripPlan(tables).updates
    expect(newest).toMatchObject({
      items: ["recS1", "recS1-night"],
      units: ["avdelning-43", "avdelning-51", "ist-54"],
    })
    expect(older?.units).toStrictEqual(["ist-54"])
    expect(oldest?.units).toStrictEqual([])
  })

  it("answers from the trip base when one is set, reusing a read within the minute", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "pat-test")
    vi.stubEnv("AIRTABLE_TRIP_BASE_ID", "appTrip")
    const fetch = vi.fn((url: URL) => {
      const table = decodeURIComponent(url.pathname.split("/").at(-1) ?? "")
      expect(url.pathname).toContain("/appTrip/")
      // eslint-disable-next-line security/detect-object-injection -- a table name from the stub's own URL
      return Promise.resolve(Response.json({ records: tables[table] ?? [] }))
    })
    vi.stubGlobal("fetch", fetch)
    const routes = journeyRoutes(() => 0)
    await routes.request("/plan")
    const response = await routes.request("/plan")
    const body = (await response.json()) as { units: readonly { key: string }[] }
    expect(body.units.map((unit) => unit.key)).toStrictEqual([
      "avdelning-43",
      "avdelning-51",
      "ist-54",
    ])
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  it("refuses the itinerary base without a base id", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "pat-test")
    vi.stubEnv("AIRTABLE_BASE_ID", undefined)
    vi.stubEnv("AIRTABLE_TRIP_BASE_ID", undefined)
    const response = await journeyRoutes(() => 0).request("/plan")
    expect(response.status).toBe(500)
  })
})
