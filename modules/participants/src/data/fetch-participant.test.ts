import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchParticipantQuery } from "./fetch-participant"
import type { Viewer } from "./viewer"

/**
 * Where one person is asked for at one level, spelled the way the module spells it.
 */
function individual(memberNo: string, level: "basic" | "full"): string {
  return `/api/project/participants/individual/${memberNo}?infolevel=${level}`
}

/**
 * One person as the participants service sends them at basic level.
 */
function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Lars Lindberg",
    member_no: 1_100_101,
    born: "1995-07-16",
    email: "lars.lindberg@example.se",
    mobile: "070-719 56 23",
    member_type: "Avdelningsledare",
    troop: "1",
    contact_info: {},
    ...overrides,
  }
}

/**
 * Stands in for the platform's `fetch`: each address answers from its own queue, and an
 * address with nothing left to say reads as a dead network.
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
const health: Viewer = { memberNo: "42", readsEveryone: true, readsHealth: true }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the level a viewer asks at", () => {
  it("asks nothing at all before anybody has signed in", () => {
    const nobody: Viewer = { memberNo: "", readsEveryone: false, readsHealth: false }

    expect(fetchParticipantQuery("1100101", nobody).enabled).toBe(false)
  })

  it("asks in full for a leader, who reads their own unit's answers", async () => {
    const asked = networkAnswers({ [individual("1100101", "full")]: [Response.json(record())] })

    await testClient().query(fetchParticipantQuery("1100101", leader))

    expect(asked).toEqual([individual("1100101", "full")])
  })

  it("asks in full for a health grant", async () => {
    const asked = networkAnswers({ [individual("1100101", "full")]: [Response.json(record())] })

    await testClient().query(fetchParticipantQuery("1100101", health))

    expect(asked).toEqual([individual("1100101", "full")])
  })

  it("asks at basic for management without a health grant", async () => {
    const asked = networkAnswers({ [individual("1100101", "basic")]: [Response.json(record())] })

    await testClient().query(fetchParticipantQuery("1100101", management))

    expect(asked).toEqual([individual("1100101", "basic")])
  })

  it("asks at an encoded address when the member number carries a reserved character", async () => {
    // The number is read from a service payload, so it must not rewrite the path.
    const asked = networkAnswers({
      [individual("10%2F01", "basic")]: [Response.json(record({ member_no: "10/01" }))],
    })

    await testClient().query(fetchParticipantQuery("10/01", management))

    expect(asked).toEqual([individual("10%2F01", "basic")])
  })
})

describe("stepping down from a refused full ask", () => {
  it("asks the same person again at basic, exactly once", async () => {
    // A leader who also serves in the management, reading outside their own unit.
    const asked = networkAnswers({
      [individual("1300035", "full")]: [new Response("{}", { status: 403 })],
      [individual("1300035", "basic")]: [Response.json(record({ member_no: 1_300_035 }))],
    })

    const person = await testClient().query(fetchParticipantQuery("1300035", leader))

    expect(person.memberNo).toBe("1300035")
    expect(person.health).toBeUndefined()
    expect(asked).toEqual([individual("1300035", "full"), individual("1300035", "basic")])
  })

  it("surfaces a refusal at basic rather than asking a third time", async () => {
    const asked = networkAnswers({
      [individual("1300035", "full")]: [new Response("{}", { status: 403 })],
      [individual("1300035", "basic")]: [new Response("{}", { status: 403 })],
    })

    await expect(testClient().query(fetchParticipantQuery("1300035", leader))).rejects.toThrow(
      /answered 403/u,
    )
    expect(asked).toHaveLength(2)
  })

  it("never steps down from a basic ask", async () => {
    const asked = networkAnswers({
      [individual("1300035", "basic")]: [new Response("{}", { status: 403 })],
    })

    await expect(testClient().query(fetchParticipantQuery("1300035", management))).rejects.toThrow(
      /answered 403/u,
    )
    expect(asked).toHaveLength(1)
  })
})

describe("what the screen cannot show", () => {
  it("surfaces a member number nobody holds", async () => {
    const asked = networkAnswers({
      [individual("999", "basic")]: [new Response("{}", { status: 404 })],
    })

    await expect(testClient().query(fetchParticipantQuery("999", management))).rejects.toThrow(
      /answered 404/u,
    )
    // A 404 is the answer, not a refusal to step down from.
    expect(asked).toHaveLength(1)
  })

  it("surfaces a payload that is not a person", async () => {
    networkAnswers({
      [individual("999", "basic")]: [
        Response.json({ detail: "Participant not found in project." }),
      ],
    })

    await expect(testClient().query(fetchParticipantQuery("999", management))).rejects.toThrow(
      /is not a person/u,
    )
  })
})
