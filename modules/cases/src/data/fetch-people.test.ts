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
 * Where one member type's names are asked for.
 */
function names(key: string): string {
  return `/api/project/participants/troopinfo/${key}?infolevel=name`
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

const contingent = { kind: "contingent" } as const

/**
 * The service's answer to a listing nobody is in, or one it does not offer.
 * @returns The 404.
 */
function notFound(): Response {
  return Response.json({ detail: "Troop not found in project." }, { status: 404 })
}

describe("everyone in the contingent", () => {
  const whole = "/api/project/participants/troopinfo?infolevel=basic"
  const everyone = [
    lars,
    hanna,
    row(11, "Ester Dahl", "Deltagare", "1"),
    row(21, "Vilgot Berg", "Deltagare", "2"),
    row(31, "Ivar Ek", "IST", ""),
    row(41, "Pernilla Palm", "Kontingentledning", ""),
  ]

  it("asks for the whole contingent in one request, at the basic level", async () => {
    const asked = networkAnswers({ [whole]: () => Response.json(everyone) })

    await testClient().query(fetchPeopleQuery(contingent))

    expect(asked).toEqual([whole])
  })

  it("holds each person by member number", async () => {
    networkAnswers({ [whole]: () => Response.json(everyone) })

    const people = await testClient().query(fetchPeopleQuery(contingent))

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

  it("reads a contingent nobody is in as empty rather than as a failure", async () => {
    networkAnswers({ [whole]: notFound })

    const people = await testClient().query(fetchPeopleQuery(contingent))

    expect(people.size).toBe(0)
  })

  it("fails the query on a failed read, and leaves asking again to the query client", async () => {
    const asked = networkAnswers({ [whole]: () => new Response("{}", { status: 503 }) })

    await expect(testClient().query(fetchPeopleQuery(contingent))).rejects.toThrow(/answered 503/u)
    expect(asked).toEqual([whole])
  })

  it("fails with a refusal as it came", async () => {
    networkAnswers({ [whole]: () => new Response("{}", { status: 401 }) })

    await expect(testClient().query(fetchPeopleQuery(contingent))).rejects.toMatchObject({
      status: 401,
    })
  })

  it("caches under the module's own key, fresh for an hour or more", () => {
    const options = fetchPeopleQuery(contingent)

    expect(options.queryKey).toEqual(["cases", "people", "contingent"])
    expect(options.staleTime).toBeGreaterThanOrEqual(60 * 60 * 1000)
  })
})

describe("a leader's own units", () => {
  const unitOne = { kind: "units", unitNumbers: [1] } as const

  it("reads the leader's own units, and the names alone of every leader and the management", async () => {
    const asked = networkAnswers({
      ...contingentAnswers(),
      [names("al")]: () =>
        Response.json([
          { member_no: 1, name: "Lars Lindberg" },
          { member_no: 2, name: "Hanna Hellström" },
        ]),
      [names("cmt")]: () => Response.json([{ member_no: 41, name: "Pernilla Palm" }]),
    })

    const people = await testClient().query(fetchPeopleQuery(unitOne))

    expect(asked).toHaveLength(3)
    expect(asked).toEqual(expect.arrayContaining([names("al"), names("cmt"), troopinfo("1")]))
    expect(people.get("1")).toEqual({
      memberNo: "1",
      name: "Lars Lindberg",
      role: "ledare",
      troop: "1",
    })
    expect(people.get("2")).toEqual({ memberNo: "2", name: "Hanna Hellström", role: "ledare" })
    expect(people.get("41")).toEqual({
      memberNo: "41",
      name: "Pernilla Palm",
      role: "kontingentledning",
    })
    expect(people.has("21")).toBe(false)
  })

  it("reads only the leader's own units where the service gives no adults' names", async () => {
    networkAnswers({ ...contingentAnswers(), [names("al")]: notFound, [names("cmt")]: notFound })

    const people = await testClient().query(fetchPeopleQuery(unitOne))

    expect(people.size).toBe(2)
    expect(people.keys().toArray()).toEqual(expect.arrayContaining(["1", "11"]))
  })

  it("asks a failed listing once more, and keeps what it answers then", async () => {
    let attempts = 0
    const asked = networkAnswers({
      ...contingentAnswers(),
      [names("al")]: notFound,
      [names("cmt")]: notFound,
      [troopinfo("1")]: () => {
        attempts += 1
        return attempts === 1
          ? new Response("{}", { status: 500 })
          : Response.json([lars, row(11, "Ester Dahl", "Deltagare", "1")])
      },
    })

    const people = await testClient().query(fetchPeopleQuery(unitOne))

    expect(people.has("11")).toBe(true)
    expect(asked.filter((url) => url === troopinfo("1"))).toHaveLength(2)
    expect(asked.filter((url) => url === names("al"))).toHaveLength(1)
  })

  it("fails the whole query when a listing fails twice", async () => {
    // A reach missing a unit looks complete to whoever searches it.
    networkAnswers({
      ...contingentAnswers(),
      [names("al")]: notFound,
      [names("cmt")]: notFound,
      [troopinfo("1")]: () => new Response("{}", { status: 500 }),
    })

    await expect(testClient().query(fetchPeopleQuery(unitOne))).rejects.toThrow(/answered 500/u)
  })

  it("fails with the refusal ahead of any other failure, and never asks it again", async () => {
    const asked = networkAnswers({
      ...contingentAnswers(),
      [names("al")]: () => new Response("{}", { status: 401 }),
      [names("cmt")]: notFound,
      [troopinfo("1")]: () => new Response("{}", { status: 500 }),
    })

    const refused = testClient().query(fetchPeopleQuery(unitOne))

    await expect(refused).rejects.toBeInstanceOf(HttpError)
    await expect(refused).rejects.toMatchObject({ status: 401 })
    expect(asked.filter((url) => url === names("al"))).toHaveLength(1)
  })

  it("caches apart from the contingent, by the units it holds", () => {
    expect(fetchPeopleQuery(unitOne).queryKey).toEqual(["cases", "people", "1"])
  })
})
