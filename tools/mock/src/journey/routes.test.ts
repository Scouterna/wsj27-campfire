import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { journeyRoutes } from "./routes.ts"

/**
 * A small base: a unit and an IST patrol sharing a number, a travel group, a place, items for
 * the group and for the unit alone, a note, an exception, and a delay.
 */
const tables: Readonly<Record<string, readonly object[]>> = {
  Exceptions: [
    {
      fields: {
        End: "2027-07-28T10:00:00.000Z",
        Start: "2027-07-21T00:00:00.000Z",
        Title: "Sen",
        Unit: ["recU1"],
      },
      id: "recE1",
    },
  ],
  Itinerary: [
    {
      fields: {
        End: "2027-07-21T06:30:00.000Z",
        Kind: "Gathering",
        Place: ["recP1"],
        Start: "2027-07-21T05:30:00.000Z",
        Title: "Samling",
        "Travel groups": ["recG1"],
      },
      id: "recI2",
    },
    {
      fields: {
        End: "2027-07-20T12:00:00.000Z",
        Kind: "Activity",
        Start: "2027-07-20T10:00:00.000Z",
        Title: "Egen",
        Units: ["recU1"],
      },
      id: "recI1",
    },
  ],
  Places: [{ fields: { Name: "Cityterminalen" }, id: "recP1" }],
  "Travel groups": [{ fields: { Name: "Rundresa A", Travel: "Rundresa" }, id: "recG1" }],
  "Unit notes": [{ fields: { Item: ["recI2"], Note: "Kom i tid", Unit: ["recU1"] }, id: "recN1" }],
  Units: [
    {
      fields: { Kind: "IST-patrull", Name: "IST-patrull 1", Number: 1, "Travel group": ["recG1"] },
      id: "recU2",
    },
    {
      fields: { Kind: "Avdelning", Name: "Avdelning 1", Number: 1, "Travel group": ["recG1"] },
      id: "recU1",
    },
  ],
  Updates: [
    {
      fields: {
        "Delay minutes": 30,
        Items: ["recI2"],
        Kind: "Delay",
        Posted: "2027-07-21T05:00:00.000Z",
        Title: "Sent",
      },
      id: "recX1",
    },
  ],
}

let now = 0

beforeEach(() => {
  // A fresh hour per test, so no test is served the previous one's cached base.
  now += 3_600_000
  vi.stubEnv("AIRTABLE_TOKEN", "pat-test")
  vi.stubEnv("AIRTABLE_BASE_ID", "appTest")
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL) => {
      const table = decodeURIComponent(url.pathname.split("/").at(-1) ?? "")
      // eslint-disable-next-line security/detect-object-injection -- a table name from the stub's own URL
      return Promise.resolve(Response.json({ records: tables[table] ?? [] }))
    }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/**
 * The plan as the route answers it, typed only as far as the tests read it.
 */
interface PlanBody {
  readonly exceptions: readonly { readonly unit: string }[]
  readonly items: readonly {
    readonly id: string
    readonly place?: { readonly name: string; readonly timeZone: string }
    readonly units: readonly string[]
  }[]
  readonly notes: readonly { readonly item: string; readonly unit: string }[]
  readonly units: readonly { readonly key: string; readonly kind: string }[]
  readonly updates: readonly { readonly units: readonly string[] }[]
}

/**
 * Reads the plan from a fresh set of routes.
 * @returns The plan.
 */
async function readPlan(): Promise<PlanBody> {
  const response = await journeyRoutes(() => now).request("/plan")
  return (await response.json()) as PlanBody
}

describe("the journey spike's plan", () => {
  it("keys units and IST patrols apart, units first, though they share a number", async () => {
    const body = await readPlan()
    expect(body.units.map((unit) => unit.key)).toStrictEqual(["avdelning-1", "ist-1"])
  })

  it("resolves an item's travel groups to the units in them, in start order", async () => {
    const body = await readPlan()
    expect(body.items.map((item) => [item.id, item.units])).toStrictEqual([
      ["recI1", ["avdelning-1"]],
      ["recI2", ["avdelning-1", "ist-1"]],
    ])
    expect(body.items[1]?.place).toStrictEqual({
      name: "Cityterminalen",
      timeZone: "Europe/Stockholm",
    })
  })

  it("names everyone an update reaches through the items it moves", async () => {
    const body = await readPlan()
    expect(body.updates[0]?.units).toStrictEqual(["avdelning-1", "ist-1"])
    expect(body.notes[0]).toMatchObject({ item: "recI2", unit: "avdelning-1" })
    expect(body.exceptions[0]?.unit).toBe("avdelning-1")
  })

  it("forgets a failed read, so the next request asks again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: 401 }))),
    )
    const routes = journeyRoutes(() => now)
    const refused = await routes.request("/plan")
    expect(refused.status).toBe(500)

    vi.stubEnv("AIRTABLE_TOKEN", undefined)
    const unconfigured = await routes.request("/plan")
    expect(unconfigured.status).toBe(500)
  })

  it("follows Airtable's pages and reads rows with links and fields missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: URL) => {
        const table = decodeURIComponent(url.pathname.split("/").at(-1) ?? "")
        const isSecondPage = url.searchParams.get("offset") === "next"
        if (table === "Units") {
          return Promise.resolve(
            Response.json(
              isSecondPage
                ? { records: [{ fields: { Number: 2 }, id: "recU3" }] }
                : {
                    offset: "next",
                    records: [{ fields: { Name: "Avdelning 1", Number: 1 }, id: "recU1" }],
                  },
            ),
          )
        }
        if (table === "Places") {
          return Promise.resolve(
            Response.json({
              records: [{ fields: { Name: "Riga", "Time zone": "Europe/Riga" }, id: "recP1" }],
            }),
          )
        }
        if (table === "Itinerary") {
          return Promise.resolve(
            Response.json({
              records: [{ fields: { Place: ["recP1"], Title: "Ensam" }, id: "recI9" }],
            }),
          )
        }
        if (table === "Updates") {
          return Promise.resolve(
            Response.json({
              records: [{ fields: { Title: "Till en", Units: ["recU3"] }, id: "recX9" }],
            }),
          )
        }
        return Promise.resolve(Response.json({ records: [] }))
      }),
    )
    const body = await readPlan()
    expect(body.units.map((unit) => unit.key)).toStrictEqual(["avdelning-1", "avdelning-2"])
    expect(body.items[0]?.units).toStrictEqual([])
    expect(body.items[0]?.place?.timeZone).toBe("Europe/Riga")
    expect(body.updates[0]?.units).toStrictEqual(["avdelning-2"])
  })
})
