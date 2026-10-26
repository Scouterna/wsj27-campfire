import { HttpError } from "@scouterna/wsj27-campfire-utils"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchParticipantsQuery } from "./fetch-participants"
import type { Viewer } from "./viewer"

/**
 * Where one listing is asked for, spelled the way the module spells it – the whole
 * contingent without a key, one unit with its number.
 */
function troopinfo(key?: string): string {
  const path = key === undefined ? "" : `/${key}`
  return `/api/project/participants/troopinfo${path}?infolevel=basic`
}

/**
 * A listing row as the participants service sends it.
 */
function row(
  memberNo: number,
  name: string,
  memberType: string,
  troop: string,
): Record<string, unknown> {
  return { name, member_no: memberNo, member_type: memberType, troop, mobile: "070-000 00 00" }
}

const lars = row(1, "Lars Lindberg", "Avdelningsledare", "1")
const unitOne = [lars, row(11, "Ester Dahl", "Deltagare", "1")]
const contingent = [
  ...unitOne,
  row(2, "Hanna Hellström", "Avdelningsledare", "2"),
  row(21, "Vilgot Berg", "Deltagare", "2"),
  row(31, "Ivar Ek", "IST", ""),
  row(41, "Pernilla Palm", "Kontingentledning", ""),
]

/**
 * Stands in for the platform's `fetch`: each address answers from its own queue, and an
 * address with nothing left to say reads as a dead network. Returns the list the stub
 * appends to, so a test can count what was asked and in what order.
 */
function networkAnswers(queues: Readonly<Record<string, readonly Response[]>>): readonly string[] {
  const asked: string[] = []
  const remaining = new Map(
    Object.entries(queues).map(([address, answers]) => [address, [...answers]]),
  )

  vi.stubGlobal("fetch", (url: string): Promise<Response> => {
    asked.push(url)
    const answer = remaining.get(url)?.shift()
    return answer === undefined
      ? Promise.reject(new TypeError("Load failed"))
      : Promise.resolve(answer)
  })

  return asked
}

/**
 * A fresh query client per test, so no answer cached by one test leaks into the next.
 */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
}

const leader: Viewer = { memberNo: "1", unitNumber: 1, readsEveryone: false, readsHealth: false }
const management: Viewer = { memberNo: "41", readsEveryone: true, readsHealth: false }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("what the viewer is allowed to ask for", () => {
  it("asks nothing at all before anybody has signed in", () => {
    const nobody: Viewer = { memberNo: "", readsEveryone: false, readsHealth: false }

    expect(fetchParticipantsQuery(nobody).enabled).toBe(false)
  })

  it("asks a leader's own unit, and nothing else", async () => {
    const asked = networkAnswers({ [troopinfo("1")]: [Response.json(unitOne)] })

    const list = await testClient().query(fetchParticipantsQuery(leader))

    expect(list.scope).toEqual({ kind: "unit", unitNumber: 1 })
    expect(list.people.map((person) => person.memberNo)).toEqual(["1", "11"])
    expect(asked).toEqual([troopinfo("1")])
  })

  it("asks nothing for a viewer with neither grant, and says so in the scope", async () => {
    const outsider: Viewer = { memberNo: "99", readsEveryone: false, readsHealth: false }
    const asked = networkAnswers({})

    const list = await testClient().query(fetchParticipantsQuery(outsider))

    expect(list).toEqual({ people: [], scope: { kind: "nobody" } })
    expect(asked).toEqual([])
  })

  it("reads the whole contingent for someone who is a leader as well", async () => {
    // The wider answer contains the narrower one, so the management branch wins.
    const both: Viewer = { memberNo: "1", unitNumber: 1, readsEveryone: true, readsHealth: false }
    const asked = networkAnswers({ [troopinfo()]: [Response.json(contingent)] })

    const list = await testClient().query(fetchParticipantsQuery(both))

    expect(list.scope).toEqual({ kind: "all" })
    expect(asked).toEqual([troopinfo()])
  })
})

describe("reading the whole contingent", () => {
  it("asks once at basic, and keeps every row as a person", async () => {
    const asked = networkAnswers({ [troopinfo()]: [Response.json(contingent)] })

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list.scope).toEqual({ kind: "all" })
    expect(list.people.map((person) => person.memberNo)).toEqual(["1", "11", "2", "21", "31", "41"])
    expect(asked).toEqual([troopinfo()])
  })

  it("reads an empty answer as an empty list", async () => {
    networkAnswers({ [troopinfo()]: [Response.json([])] })

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list).toEqual({ people: [], scope: { kind: "all" } })
  })

  it("reads a 404 as an empty list rather than as a failure", async () => {
    // The service refuses a caller it does not count as the management with a 404.
    networkAnswers({ [troopinfo()]: [new Response("{}", { status: 404 })] })

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list).toEqual({ people: [], scope: { kind: "all" } })
  })

  it.each([
    ["a 503", [new Response("{}", { status: 503 })], /answered 503/u],
    ["a dead network", [], /Could not reach/u],
  ] as const)(
    "fails after one request on %s, leaving the retry to the client",
    async (_, answers, reason) => {
      const asked = networkAnswers({ [troopinfo()]: answers })

      await expect(testClient().query(fetchParticipantsQuery(management))).rejects.toThrow(reason)
      expect(asked).toEqual([troopinfo()])
    },
  )

  it("fails with the refusal on a 401, for the query client to act on", async () => {
    networkAnswers({ [troopinfo()]: [new Response("{}", { status: 401 })] })

    const refused = testClient().query(fetchParticipantsQuery(management))

    await expect(refused).rejects.toBeInstanceOf(HttpError)
    await expect(refused).rejects.toMatchObject({ message: /answered 401/u, status: 401 })
  })
})
