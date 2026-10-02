import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchNotesQuery } from "./fetch-notes"

/**
 * Stands in for the platform's `fetch`, answering every address with the same response,
 * and returns the addresses asked for.
 */
function networkAnswers(answer: () => Response): readonly string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", (url: string): Promise<Response> => {
    asked.push(url)
    return Promise.resolve(answer())
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

describe("one case's notes", () => {
  it("asks the case's own address, and caches under the case", async () => {
    const asked = networkAnswers(() => Response.json([]))

    await testClient().query(fetchNotesQuery("7"))

    expect(asked).toEqual(["/api/project/cases/7/notes"])
    expect(fetchNotesQuery("7").queryKey).toEqual(["cases", "notes", "7"])
  })

  it("encodes the case, so an address bar cannot rewrite the path", async () => {
    const asked = networkAnswers(() => Response.json([]))

    await testClient().query(fetchNotesQuery("7/../1"))

    expect(asked).toEqual(["/api/project/cases/7%2F..%2F1/notes"])
  })

  it("reads the notes in the order they came, dropping the unreadable ones", async () => {
    networkAnswers(() =>
      Response.json([
        { id: 2, case_id: 7, created_at: "2026-09-26T13:00:00Z", creator_id: 1, note: "Bättre" },
        { id: 1, case_id: 7 },
      ]),
    )

    const notes = await testClient().query(fetchNotesQuery("7"))

    expect(notes.map((note) => note.text)).toEqual(["Bättre"])
  })

  it("fails with the service's refusal for a case it does not know", async () => {
    networkAnswers(() => new Response("{}", { status: 404 }))

    await expect(testClient().query(fetchNotesQuery("99"))).rejects.toMatchObject({
      status: 404,
    })
  })
})
