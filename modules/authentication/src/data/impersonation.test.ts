import { HttpError } from "@scouterna/wsj27-campfire-utils"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  fetchImpersonationOfferQuery,
  fetchImpersonationTargetsQuery,
  forgetImpersonation,
  impersonate,
  ImpersonationError,
  isImpersonating,
  rememberImpersonation,
} from "./impersonation"

/**
 * What one request to the stubbed network carried.
 */
interface Request {
  readonly body?: unknown
  readonly method: string
  readonly url: string
}

/**
 * Stands in for the platform's `fetch`, where each address answers from its own queue
 * and an address with nothing left to say reads as a dead network. Returns the list the
 * stub appends to, so a test can see what was asked.
 */
function networkAnswers(queues: Readonly<Record<string, readonly Response[]>>): readonly Request[] {
  const asked: Request[] = []
  const remaining = new Map(
    Object.entries(queues).map(([address, answers]) => [address, [...answers]]),
  )

  vi.stubGlobal("fetch", (url: string, init?: RequestInit): Promise<Response> => {
    asked.push({
      method: init?.method ?? "GET",
      url,
      ...(typeof init?.body === "string" && { body: JSON.parse(init.body) as unknown }),
    })
    const answer = remaining.get(url)?.shift()
    return answer === undefined
      ? Promise.reject(new TypeError("Load failed"))
      : Promise.resolve(answer)
  })

  return asked
}

/**
 * A refusal as FastAPI sends one – a status and a detail body the client never reads.
 */
function status(code: number): Response {
  return Response.json({ detail: "refused" }, { status: code })
}

/**
 * A fresh query client per test, with no retries, so every answer is the stub's.
 */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
}

/**
 * Stands in for the browser's local storage with a plain map, so a test reads back what
 * was written.
 */
function storage(): Map<string, string> {
  const items = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    // eslint-disable-next-line unicorn/no-null -- Storage answers null for a key it does not hold
    getItem: (key: string) => items.get(key) ?? null,
    removeItem: (key: string) => items.delete(key),
    setItem: (key: string, value: string) => items.set(key, value),
  })
  return items
}

/**
 * What a browser that refuses its storage answers every call with.
 */
function refuse(): never {
  throw new DOMException("The operation is insecure.", "SecurityError")
}

/**
 * Stands in for a browser that refuses its storage, the way a private window can.
 */
function refusingStorage(): void {
  vi.stubGlobal("localStorage", { getItem: refuse, removeItem: refuse, setItem: refuse })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("asking whether impersonation is offered", () => {
  const offer = "/api/auth/impersonate"

  it("is offered where the route refuses a GET with 405, the way a POST-only route answers", async () => {
    const asked = networkAnswers({ [offer]: [status(405)] })

    await expect(testClient().query(fetchImpersonationOfferQuery())).resolves.toBe(true)
    expect(asked).toEqual([{ method: "GET", url: offer }])
  })

  it("is not offered where the route does not exist", async () => {
    networkAnswers({ [offer]: [status(404)] })

    await expect(testClient().query(fetchImpersonationOfferQuery())).resolves.toBe(false)
  })

  it("is not offered where something other than the auth service answers the GET", async () => {
    networkAnswers({ [offer]: [Response.json({})] })

    await expect(testClient().query(fetchImpersonationOfferQuery())).resolves.toBe(false)
  })

  it("rethrows a refused session, for the session to act on", async () => {
    networkAnswers({ [offer]: [status(401)] })

    await expect(testClient().query(fetchImpersonationOfferQuery())).rejects.toBeInstanceOf(
      HttpError,
    )
  })

  it.each([502, 503])(
    "throws rather than answers when the server fails with %i, so no answer is remembered",
    async (code) => {
      networkAnswers({ [offer]: [status(code)] })

      await expect(testClient().query(fetchImpersonationOfferQuery())).rejects.toBeInstanceOf(
        HttpError,
      )
    },
  )

  it("throws rather than answers when nothing answered, so no answer is remembered", async () => {
    networkAnswers({})

    await expect(testClient().query(fetchImpersonationOfferQuery())).rejects.toThrow(
      "Could not reach",
    )
  })
})

describe("reading who may be impersonated", () => {
  const leaders = "/api/project/participants/troopinfo/al?infolevel=basic"
  const management = "/api/project/participants/troopinfo/cmt?infolevel=basic"
  const leader = { member_no: 1, name: "Lars Lindberg", roles: ["wsj27:al:1"] }
  const manager = { member_no: 2, name: "Pernilla Palm", roles: ["wsj27:cmt:program"] }

  it("reads the management's listing and the leaders', the management first", async () => {
    const asked = networkAnswers({
      [leaders]: [Response.json([leader])],
      [management]: [Response.json([manager])],
    })

    const targets = await testClient().query(fetchImpersonationTargetsQuery())

    expect(targets.map((target) => target.memberNo)).toEqual(["2", "1"])
    expect(
      asked.map((request) => request.url).toSorted((left, right) => left.localeCompare(right)),
    ).toEqual([leaders, management])
  })

  it("reads an empty listing, which answers 404, as no rows", async () => {
    networkAnswers({ [leaders]: [Response.json([leader])], [management]: [status(404)] })

    const targets = await testClient().query(fetchImpersonationTargetsQuery())

    expect(targets.map((target) => target.memberNo)).toEqual(["1"])
  })

  it("fails as a whole when a listing is refused, rather than looking complete", async () => {
    networkAnswers({ [leaders]: [status(403)], [management]: [Response.json([manager])] })

    await expect(testClient().query(fetchImpersonationTargetsQuery())).rejects.toBeInstanceOf(
      HttpError,
    )
  })

  it("converts the cached rows into people on the way out", () => {
    const { select } = fetchImpersonationTargetsQuery()

    expect(select?.([leader])).toEqual([
      {
        firstName: "Lars",
        memberNo: "1",
        name: "Lars Lindberg",
        roles: [{ kind: "leader", unitNumber: 1 }],
        unit: { number: 1 },
      },
    ])
  })
})

describe("impersonating", () => {
  const address = "/api/auth/impersonate"
  // As the service answers an impersonation – with no email or picture, because nothing
  // of the caller's is kept and the target's are unknown.
  const answer = {
    user: {
      familyName: "Lindberg",
      givenName: "Lars",
      memberNo: "1100101",
      name: "Lars Lindberg",
      preferredUsername: "1100101@scoutnet",
      roles: ["wsj27:al:1"],
    },
  }

  it("posts the member number and answers with the member now signed in", async () => {
    const asked = networkAnswers({ [address]: [Response.json(answer)] })

    const user = await impersonate("1100101")

    expect(asked).toEqual([{ body: { member_no: "1100101" }, method: "POST", url: address }])
    expect(user?.memberNo).toBe("1100101")
    expect(user?.name).toBe("Lars Lindberg")
  })

  it("answers nobody it can decode when the service left the name out", async () => {
    // eslint-disable-next-line unicorn/no-null -- the service sends null for a name it could not look up
    networkAnswers({ [address]: [Response.json({ user: { ...answer.user, name: null } })] })

    await expect(impersonate("1100101")).resolves.toBeUndefined()
  })

  it.each([
    [403, "forbidden"],
    [404, "unavailable"],
    [503, "notReady"],
    [401, "failed"],
    [500, "failed"],
  ] as const)("says why when the service answers %i", async (code, failure) => {
    networkAnswers({ [address]: [status(code)] })

    const refusal = impersonate("1100101")

    await expect(refusal).rejects.toBeInstanceOf(ImpersonationError)
    await expect(refusal).rejects.toMatchObject({ failure })
  })

  it("fails without a reason when nothing answered", async () => {
    networkAnswers({})

    await expect(impersonate("1100101")).rejects.toMatchObject({ failure: "failed" })
  })
})

describe("remembering an impersonation", () => {
  it("knows the member it made the session", () => {
    storage()

    rememberImpersonation("1100101")

    expect(isImpersonating("1100101")).toBe(true)
  })

  it("says nothing about anybody else signed in", () => {
    storage()

    rememberImpersonation("1100101")

    expect(isImpersonating("1200101")).toBe(false)
    expect(isImpersonating("")).toBe(false)
  })

  it("forgets it", () => {
    const items = storage()
    rememberImpersonation("1100101")

    forgetImpersonation()

    expect(isImpersonating("1100101")).toBe(false)
    expect(items.size).toBe(0)
  })

  it("remembers nothing, and fails nothing, where the browser refuses its storage", () => {
    refusingStorage()

    expect(() => {
      rememberImpersonation("1100101")
      forgetImpersonation()
    }).not.toThrow()
    expect(isImpersonating("1100101")).toBe(false)
  })
})
