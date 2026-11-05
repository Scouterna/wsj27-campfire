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

describe("reading a leader's unit in full", () => {
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

    const details = await new QueryClient().query(fetchUnitDetailsQuery(leader))

    expect(sent).toHaveBeenCalledWith("/api/project/participants/troopinfo/2?infolevel=full")
    expect(details.map((detail) => detail.memberNo)).toEqual(["1300140"])
    expect(details[0]?.firstName).toBe("Molly")
  })

  it("reads a 404 as an empty unit rather than as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof globalThis.fetch>(() => Promise.resolve(new Response("{}", { status: 404 }))),
    )

    const details = await new QueryClient().query(fetchUnitDetailsQuery(leader))

    expect(details).toEqual([])
  })

  it("fails on any other answer, leaving the retry to the client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof globalThis.fetch>(() => Promise.resolve(new Response("{}", { status: 503 }))),
    )

    await expect(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }).query(
        fetchUnitDetailsQuery(leader),
      ),
    ).rejects.toThrow(/answered 503/u)
  })

  it("asks nothing for a viewer who leads no unit", () => {
    const options = fetchUnitDetailsQuery({
      memberNo: "1200001",
      readsEveryone: true,
      readsHealth: true,
    })

    expect(options.enabled).toBe(false)
  })
})
