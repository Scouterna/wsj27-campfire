import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchAccessQuery } from "./fetch-access"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("who can open a case", () => {
  it("asks the service for the case and reads the member numbers, dropping what is none", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", (url: string): Promise<Response> => {
      asked.push(url)
      return Promise.resolve(Response.json([1_200_001, "x", 1_100_101]))
    })
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })

    const memberNos = await client.query(fetchAccessQuery("7"))

    expect(asked).toEqual(["/api/project/cases/7/access"])
    expect(memberNos).toEqual(["1200001", "1100101"])
  })

  it("reads an answer that is no list as nobody", async () => {
    vi.stubGlobal("fetch", (): Promise<Response> => Promise.resolve(Response.json({})))
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })

    expect(await client.query(fetchAccessQuery("7"))).toEqual([])
  })
})
