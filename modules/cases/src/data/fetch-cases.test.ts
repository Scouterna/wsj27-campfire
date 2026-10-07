import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchCasesQuery } from "./fetch-cases"

/**
 * A case as the cases service sends it.
 */
function row(id: number, title: string): Record<string, unknown> {
  return {
    id,
    created_at: "2026-09-26T12:05:00+00:00",
    creator_id: 1_100_101,
    title,
    about_person_id: 1_100_111,
    troop: "1",
    closed: false,
  }
}

/**
 * Stands in for the platform's `fetch`, answering every address with the same body, and
 * returns the addresses asked for.
 */
function networkAnswers(body: unknown): readonly string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", (url: string): Promise<Response> => {
    asked.push(url)
    return Promise.resolve(Response.json(body))
  })
  return asked
}

/**
 * A fresh query client per test, so no answer cached by one test leaks into the next.
 */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the list of cases", () => {
  it("asks for the open cases alone unless the closed ones are wanted", async () => {
    const asked = networkAnswers([])

    await testClient().query(fetchCasesQuery(false))

    expect(asked).toEqual(["/api/project/cases?include_closed=false"])
  })

  it("asks for the closed cases too when they are wanted", async () => {
    const asked = networkAnswers([])

    await testClient().query(fetchCasesQuery(true))

    expect(asked).toEqual(["/api/project/cases?include_closed=true"])
  })

  it("caches the two lists apart, under the module's own key", () => {
    expect(fetchCasesQuery(false).queryKey).toEqual(["cases", "list", false])
    expect(fetchCasesQuery(true).queryKey).toEqual(["cases", "list", true])
  })

  it("reads the cases in the order they came, dropping the unreadable ones", async () => {
    networkAnswers([row(9, "Feber"), { id: 8 }, row(7, "Stukad fot")])

    const cases = await testClient().query(fetchCasesQuery(false))

    expect(cases.map((item) => item.title)).toEqual(["Feber", "Stukad fot"])
    expect(cases[0]?.createdAt).toEqual(new Date("2026-09-26T12:05:00Z"))
  })

  it("caches the payload as it arrived, so what is persisted survives being JSON", async () => {
    networkAnswers([row(9, "Feber")])
    // The library's own collection time, so the entry is still there to be read.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await client.query(fetchCasesQuery(false))

    expect(client.getQueryData(["cases", "list", false])).toEqual([row(9, "Feber")])
  })
})
