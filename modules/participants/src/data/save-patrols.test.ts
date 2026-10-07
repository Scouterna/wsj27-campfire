import { afterEach, describe, expect, it, vi } from "vitest"

import { savePatrols } from "./save-patrols"

describe("saving patrols", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("posts each person's patrol, null for none, to their own address", async () => {
    const sent = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(Response.json({})))
    vi.stubGlobal("fetch", sent)

    await savePatrols([
      { memberNo: "1100202", patrol: "Falkarna" },
      // eslint-disable-next-line unicorn/no-null -- the service takes null to store no patrol
      { memberNo: "1100203", patrol: null },
    ])

    expect(sent).toHaveBeenCalledWith("/api/project/participants/1100202/patrol", {
      body: '{"patrol":"Falkarna"}',
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    expect(sent.mock.calls[1]?.[1]?.body).toBe('{"patrol":null}')
  })

  it("keeps the writes that failed apart from the ones that landed, in the order asked", async () => {
    vi.stubGlobal("fetch", (url: string) =>
      Promise.resolve(
        url.includes("/2/") || url.includes("/4/")
          ? Response.json({ detail: "Could not store in Scoutnet." }, { status: 502 })
          : Response.json({}),
      ),
    )
    const writes = ["1", "2", "3", "4", "5"].map((memberNo) => ({ memberNo, patrol: "Ugglorna" }))

    const result = await savePatrols(writes)

    expect(result.failed.map((write) => write.memberNo)).toEqual(["2", "4"])
    expect(result.saved.map((write) => write.memberNo)).toEqual(["1", "3", "5"])
  })

  it("counts a request that never reached the service as failed", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Load failed")))

    const result = await savePatrols([{ memberNo: "1", patrol: "Ugglorna" }])

    expect(result).toEqual({ failed: [{ memberNo: "1", patrol: "Ugglorna" }], saved: [] })
  })
})
