import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchCaseTypesQuery } from "./fetch-case-types"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the caller's case types", () => {
  it("asks the service and keeps the types this module knows, in its order", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", (url: string): Promise<Response> => {
      asked.push(url)
      return Promise.resolve(Response.json(["cmt", "admin", "hälsa"]))
    })
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })

    const types = await client.query(fetchCaseTypesQuery())

    expect(asked).toEqual(["/api/project/cases/types"])
    expect(types).toEqual(["cmt", "hälsa"])
  })
})
