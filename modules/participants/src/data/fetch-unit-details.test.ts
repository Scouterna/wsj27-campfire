import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchUnitDetailsQuery } from "./fetch-unit-details"
import type { Viewer } from "./viewer"

const leader: Viewer = {
  memberNo: "1100201",
  readsEveryone: false,
  readsHealth: false,
  unitNumber: 2,
}

describe("reading a unit in full", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("asks for the unit once, in full, and keeps each readable person", async () => {
    const sent = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        Response.json([
          { member_no: 1_300_140, member_type: "Deltagare", name: "Molly Sundqvist", troop: "2" },
          { member_no: 1_300_141, name: "Ingen typ", troop: "2" },
        ]),
      ),
    )
    vi.stubGlobal("fetch", sent)

    const details = await new QueryClient().query(fetchUnitDetailsQuery(leader, 2))

    expect(sent).toHaveBeenCalledWith("/api/project/participants/troopinfo/2?infolevel=full")
    expect(details.map((detail) => detail.memberNo)).toEqual(["1300140"])
    expect(details[0]?.firstName).toBe("Molly")
  })

  it("lets the health team read any unit", async () => {
    const sent = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(Response.json([])))
    vi.stubGlobal("fetch", sent)
    const healthTeam = { memberNo: "1200001", readsEveryone: true, readsHealth: true }

    const options = fetchUnitDetailsQuery(healthTeam, 7)
    await new QueryClient().query(options)

    expect(options.enabled).toBe(true)
    expect(sent).toHaveBeenCalledWith("/api/project/participants/troopinfo/7?infolevel=full")
  })

  it("asks nothing for a unit the viewer may not read", () => {
    expect(fetchUnitDetailsQuery(leader, 1).enabled).toBe(false)
    expect(
      fetchUnitDetailsQuery({ memberNo: "1200102", readsEveryone: true, readsHealth: false }, 1)
        .enabled,
    ).toBe(false)
    expect(
      fetchUnitDetailsQuery(
        { memberNo: "1200001", readsEveryone: true, readsHealth: true },
        undefined,
      ).enabled,
    ).toBe(false)
  })
})
