import { HttpError } from "@scouterna/wsj27-campfire-utils"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchParticipantsQuery } from "./fetch-participants"
import type { Viewer } from "./viewer"

/**
 * Where one listing is asked for, spelled the way the module spells it.
 */
function troopinfo(key: string): string {
  return `/api/project/participants/troopinfo/${key}?infolevel=basic`
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
const hanna = row(2, "Hanna Hellström", "Avdelningsledare", "2")

const leaders = [lars, hanna]
const unitOne = [lars, row(11, "Ester Dahl", "Deltagare", "1")]
const unitTwo = [hanna, row(21, "Vilgot Berg", "Deltagare", "2")]
const ist = [row(31, "Ivar Ek", "IST", "")]
const cmt = [row(41, "Pernilla Palm", "Kontingentledning", "")]

/**
 * The whole contingent as the five listings answer it, ready to be queued per address.
 */
function contingentAnswers(): Record<string, Response[]> {
  return {
    [troopinfo("al")]: [Response.json(leaders)],
    [troopinfo("1")]: [Response.json(unitOne)],
    [troopinfo("2")]: [Response.json(unitTwo)],
    [troopinfo("ist")]: [Response.json(ist)],
    [troopinfo("cmt")]: [Response.json(cmt)],
  }
}

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
    const asked = networkAnswers(contingentAnswers())

    const list = await testClient().query(fetchParticipantsQuery(both))

    expect(list.scope).toEqual({ kind: "all" })
    expect(asked).toContain(troopinfo("al"))
  })
})

describe("assembling the whole contingent", () => {
  it("walks the leaders' listing, then every unit it names, the IST, and the management", async () => {
    const asked = networkAnswers(contingentAnswers())

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list.scope).toEqual({ kind: "all" })
    expect(asked).toEqual([
      troopinfo("al"),
      troopinfo("1"),
      troopinfo("2"),
      troopinfo("ist"),
      troopinfo("cmt"),
    ])
  })

  it("holds each person once, however many listings named them", async () => {
    // Both leaders appear in the leaders' listing and again in their own unit's.
    networkAnswers(contingentAnswers())

    const list = await testClient().query(fetchParticipantsQuery(management))

    const found = list.people.map((person) => person.memberNo)

    expect(found.toSorted((left, right) => left.localeCompare(right))).toEqual([
      "1",
      "11",
      "2",
      "21",
      "31",
      "41",
    ])
  })

  it("reads a listing nobody is in as empty rather than as a failure", async () => {
    // 404 is the service's shape for "nothing here".
    const answers = contingentAnswers()
    answers[troopinfo("ist")] = [new Response("{}", { status: 404 })]
    networkAnswers(answers)

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list.people.map((person) => person.memberNo)).not.toContain("31")
    expect(list.people).toHaveLength(5)
  })

  it("asks a failed listing once more, and completes when the second answer comes", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("2")] = [new Response("{}", { status: 500 }), Response.json(unitTwo)]
    const asked = networkAnswers(answers)

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list.people).toHaveLength(6)
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(2)
    // Only the listing that failed is asked again.
    expect(asked.filter((url) => url === troopinfo("1"))).toHaveLength(1)
  })

  it("fails the whole query when a listing still refuses the second time", async () => {
    // A partial contingent looks exactly like a complete one to whoever reads it.
    const answers = contingentAnswers()
    answers[troopinfo("2")] = [
      new Response("{}", { status: 500 }),
      new Response("{}", { status: 500 }),
    ]
    const asked = networkAnswers(answers)

    await expect(testClient().query(fetchParticipantsQuery(management))).rejects.toThrow(
      /answered 500/u,
    )
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(2)
  })

  it("asks a listing that answered 503 once more, as it would any failure but a 401", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("2")] = [new Response("{}", { status: 503 }), Response.json(unitTwo)]
    const asked = networkAnswers(answers)

    const list = await testClient().query(fetchParticipantsQuery(management))

    expect(list.people).toHaveLength(6)
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(2)
  })

  it("never asks a listing refused with 401 again, and fails with the refusal", async () => {
    // Whether to ask again is the query client's call, once it knows who is signed in.
    const answers = contingentAnswers()
    answers[troopinfo("2")] = [new Response("{}", { status: 401 }), Response.json(unitTwo)]
    const asked = networkAnswers(answers)

    const refused = testClient().query(fetchParticipantsQuery(management))

    await expect(refused).rejects.toBeInstanceOf(HttpError)
    await expect(refused).rejects.toMatchObject({ message: /answered 401/u, status: 401 })
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(1)
  })

  it("fails with the refusal ahead of a failure that came first, and still asks that one again", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("1")] = []
    answers[troopinfo("2")] = [new Response("{}", { status: 401 })]
    const asked = networkAnswers(answers)

    await expect(testClient().query(fetchParticipantsQuery(management))).rejects.toThrow(
      /answered 401/u,
    )
    expect(asked.filter((url) => url === troopinfo("1"))).toHaveLength(2)
    expect(asked.filter((url) => url === troopinfo("2"))).toHaveLength(1)
  })

  it("fails with the refusal when a listing asked again is refused the second time", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("2")] = [
      new Response("{}", { status: 500 }),
      new Response("{}", { status: 401 }),
    ]
    networkAnswers(answers)

    await expect(testClient().query(fetchParticipantsQuery(management))).rejects.toThrow(
      /answered 401/u,
    )
  })

  it("fails the whole query when the leaders' listing itself refuses", async () => {
    const answers = contingentAnswers()
    answers[troopinfo("al")] = [new Response("{}", { status: 500 })]
    networkAnswers(answers)

    await expect(testClient().query(fetchParticipantsQuery(management))).rejects.toThrow(
      /answered 500/u,
    )
  })
})
