import { HttpError } from "@scouterna/wsj27-campfire-utils"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchPeopleQuery } from "./fetch-people"

/**
 * Where one listing is asked for, spelled the way the module spells it.
 */
function troopinfo(key: string): string {
  return `/api/project/participants/troopinfo/${key}?infolevel=basic`
}

/**
 * A listing row as the participants service sends it at the basic level.
 */
function row(memberNo: number, name: string, memberType: string, troop: string): unknown {
  return { name, member_no: memberNo, member_type: memberType, troop }
}

const lars = row(1, "Lars Lindberg", "Avdelningsledare", "1")
const hanna = row(2, "Hanna Hellström", "Avdelningsledare", "2")

/**
 * The whole contingent as its listings answer it, one answer per address.
 */
function contingentAnswers(): Record<string, () => Response> {
  return {
    [troopinfo("al")]: () => Response.json([lars, hanna]),
    [troopinfo("1")]: () => Response.json([lars, row(11, "Ester Dahl", "Deltagare", "1")]),
    [troopinfo("2")]: () => Response.json([hanna, row(21, "Vilgot Berg", "Deltagare", "2")]),
    [troopinfo("ist")]: () => Response.json([row(31, "Ivar Ek", "IST", "")]),
    [troopinfo("cmt")]: () => Response.json([row(41, "Pernilla Palm", "Kontingentledning", "")]),
  }
}

/**
 * Stands in for the platform's `fetch`: each address answers from its own table entry,
 * and an address with none reads as a dead network. Returns the addresses asked for.
 */
function networkAnswers(answers: Readonly<Record<string, () => Response>>): readonly string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", (url: string): Promise<Response> => {
    asked.push(url)
    const answer = new Map(Object.entries(answers)).get(url)
    return answer === undefined
      ? Promise.reject(new TypeError("Load failed"))
      : Promise.resolve(answer())
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

describe("everyone in the contingent", () => {
  it("walks the leaders' listing, then every unit it names, the IST, and the management", async () => {
    const asked = networkAnswers(contingentAnswers())

    await testClient().query(fetchPeopleQuery())

    expect(asked).toEqual([
      troopinfo("al"),
      troopinfo("1"),
      troopinfo("2"),
      troopinfo("ist"),
      troopinfo("cmt"),
    ])
  })

  it("holds each person once, by member number", async () => {
    networkAnswers(contingentAnswers())

    const people = await testClient().query(fetchPeopleQuery())

    expect(
      people
        .keys()
        .toArray()
        .toSorted((left, right) => left.localeCompare(right)),
    ).toEqual(["1", "11", "2", "21", "31", "41"])
    expect(people.get("11")).toEqual({
      memberNo: "11",
      name: "Ester Dahl",
      role: "deltagare",
      troop: "1",
    })
    expect(people.get("41")).toEqual({
      memberNo: "41",
      name: "Pernilla Palm",
      role: "kontingentledning",
    })
  })

  it("reads a listing nobody is in as empty rather than as a failure", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("ist")] = () => new Response("{}", { status: 404 })
    networkAnswers(answers)

    const people = await testClient().query(fetchPeopleQuery())

    expect(people.has("31")).toBe(false)
    expect(people.size).toBe(5)
  })

  it("asks a failed listing once more, and keeps what it answers then", async () => {
    const answers = contingentAnswers()
    const unit = answers[troopinfo("2")]
    let attempts = 0
    answers[troopinfo("2")] = () => {
      attempts += 1
      return attempts === 1 ? new Response("{}", { status: 500 }) : (unit?.() ?? new Response())
    }
    const asked = networkAnswers(answers)

    const people = await testClient().query(fetchPeopleQuery())

    expect(people.has("21")).toBe(true)
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(2)
    expect(asked.filter((url) => url === troopinfo("1"))).toHaveLength(1)
  })

  it("fails the whole query when a unit's listing fails twice", async () => {
    // A contingent missing a unit looks complete to whoever searches it.
    const answers = contingentAnswers()
    answers[troopinfo("2")] = () => new Response("{}", { status: 500 })
    networkAnswers(answers)

    await expect(testClient().query(fetchPeopleQuery())).rejects.toThrow(/answered 500/u)
  })

  it("fails with the refusal ahead of any other failure", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("1")] = () => new Response("{}", { status: 500 })
    answers[troopinfo("2")] = () => new Response("{}", { status: 401 })
    const asked = networkAnswers(answers)

    const refused = testClient().query(fetchPeopleQuery())

    await expect(refused).rejects.toBeInstanceOf(HttpError)
    await expect(refused).rejects.toMatchObject({ status: 401 })
    // A refusal is never asked again – the query client decides that once it knows who
    // is signed in.
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(1)
  })

  it("fails the whole query when the leaders' listing fails", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("al")] = () => new Response("{}", { status: 503 })
    networkAnswers(answers)

    await expect(testClient().query(fetchPeopleQuery())).rejects.toThrow(/answered 503/u)
  })

  it("caches under the module's own key, fresh long enough to spare the walk", () => {
    const options = fetchPeopleQuery()

    expect(options.queryKey).toEqual(["cases", "people"])
    expect(options.staleTime).toBeGreaterThanOrEqual(60 * 60 * 1000)
  })
})
