import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { currentUser, keepSessionAlive, signInUrl, signOut } from "./auth"

/**
 * A payload shaped exactly as the auth service answers, with the fields a test cares
 * about overridable one at a time.
 */
function userPayload(user: Readonly<Record<string, unknown>>): unknown {
  return {
    user: {
      email: "lars@example.com",
      familyName: "Larsson",
      givenName: "Lars",
      memberNo: "1001",
      name: "Lars Larsson",
      roles: ["wsj27:al:1"],
      ...user,
    },
  }
}

/**
 * Stands in for the platform's `fetch`, where each address answers from its own queue
 * and an address with nothing left to say reads as a dead network. Returns the list the stub
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
 * A fresh query client per test, so no unit answer cached by one test leaks into the
 * next. Retries are off and nothing lingers – the stubs decide every answer anyway.
 */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
}

/**
 * A client that keeps an answer fresh the way the application's own does, so what gets
 * asked a second time is exactly what was not remembered.
 */
function rememberingClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
}

/**
 * Stands in for the browser's navigation, recording where the code tried to go.
 */
function navigationAnswers(): readonly string[] {
  const visited: string[] = []
  vi.stubGlobal("location", {
    assign: (url: string) => {
      visited.push(url)
    },
  })
  return visited
}

/**
 * Stands in for a page carrying the given cookie header, so a test decides what the page
 * can see of a session.
 * @param cookie The `document.cookie` string.
 */
function browserWith(cookie: string): void {
  vi.stubGlobal("document", { cookie })
}

// A page with no cookies at all, unless a test says otherwise.
beforeEach(() => {
  browserWith("")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The query an origin-relative address carries, read back the way a service reads it –
 * asserting the parameters rather than one long encoded literal.
 */
function queryOf(url: string, path: string): URLSearchParams {
  expect(url.startsWith(`${path}?`)).toBe(true)

  return new URLSearchParams(url.slice(path.length + 1))
}

describe("composing the sign-in address", () => {
  it("carries the address to come back to, and asks for Swedish", () => {
    const query = queryOf(signInUrl("http://localhost:8000/resa"), "/api/auth/login")

    expect(query.get("redirect_uri")).toBe("http://localhost:8000/resa")
    expect(query.get("locale")).toBe("sv")
  })
})

describe("asking who is signed in", () => {
  it("asks the session once when the first answer is one", async () => {
    const asked = networkAnswers({ "/api/auth/user": [Response.json(userPayload({}))] })

    const user = await currentUser(testClient())

    expect(user?.name).toBe("Lars Larsson")
    expect(asked.filter((url) => url === "/api/auth/user")).toHaveLength(1)
  })

  it("re-mints the token and asks again when the first answer is a refusal", async () => {
    const asked = networkAnswers({
      "/api/auth/refresh": [Response.json({})],
      "/api/auth/user": [
        new Response("{}", { status: 401 }),
        Response.json(userPayload({ name: "Anna Andersson" })),
      ],
    })

    const user = await currentUser(testClient())

    expect(user?.name).toBe("Anna Andersson")
    expect(asked.slice(0, 3)).toEqual(["/api/auth/user", "/api/auth/refresh", "/api/auth/user"])
  })

  it("answers nobody when the refresh refuses too, without retrying it", async () => {
    const asked = networkAnswers({
      "/api/auth/refresh": [new Response("{}", { status: 401 })],
      "/api/auth/user": [new Response("{}", { status: 401 })],
    })

    const user = await currentUser(testClient())

    expect(user).toBeUndefined()
    expect(asked.filter((url) => url === "/api/auth/refresh")).toHaveLength(1)
  })

  it("answers nobody when nothing answers at all, without asking for a refresh", async () => {
    // A dead network said nothing about the session, so there is no token to re-mint.
    const asked = networkAnswers({})

    const user = await currentUser(testClient())

    expect(user).toBeUndefined()
    expect(asked).toEqual(["/api/auth/user"])
  })

  it("answers nobody when the answer is not JSON – a dev server with no service behind it", async () => {
    networkAnswers({ "/api/auth/user": [new Response("<!doctype html><html></html>")] })

    await expect(currentUser(testClient())).resolves.toBeUndefined()
  })

  it("completes the unit and the travel choice from the list of participants when the roles carry none", async () => {
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ roles: ["wsj27:cmt"] }))],
      "/api/project/participants/individual/1001": [
        Response.json({ participation_type: "Direktresa", troop: "2" }),
      ],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toEqual({ number: 2 })
    // The unit the list supplied is the mark they wear – without a star, and without
    // joining the role line, which only ever names a leader's unit.
    expect(user?.mark).toEqual({ isLeader: false, unitNumber: 2 })
    expect(user?.roleLineWithUnit).toBe("CMT")
    expect(user?.travel).toBe("direktresa")
    expect(asked).toContain("/api/project/participants/individual/1001")
  })

  it("answers a user without the facts when the participants service refuses", async () => {
    networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ roles: ["wsj27:cmt"] }))],
      "/api/project/participants/individual/1001": [new Response("{}", { status: 404 })],
    })

    const user = await currentUser(testClient())

    expect(user).toBeDefined()
    expect(user?.unit).toBeUndefined()
    expect(user?.travel).toBeUndefined()
  })

  it("answers nobody when the refresh succeeds but the second ask still refuses", async () => {
    // The "refresh lied" path: a session revoked between the re-mint and the re-ask.
    const asked = networkAnswers({
      "/api/auth/refresh": [Response.json({})],
      "/api/auth/user": [new Response("{}", { status: 401 }), new Response("{}", { status: 401 })],
    })

    const user = await currentUser(testClient())

    expect(user).toBeUndefined()
    expect(asked).toEqual(["/api/auth/user", "/api/auth/refresh", "/api/auth/user"])
  })

  it("never asks the participants service when the payload carried no member number", async () => {
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ memberNo: undefined, roles: ["wsj27:cmt"] }))],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toBeUndefined()
    expect(asked).toEqual(["/api/auth/user"])
  })

  it("asks the participants service at an encoded address when the member number carries a reserved character", async () => {
    // The number is a service payload's string, so a value like "10/01" must not
    // rewrite the path it is asked on.
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ memberNo: "10/01", roles: ["wsj27:cmt"] }))],
      "/api/project/participants/individual/10%2F01": [Response.json({ troop: "2" })],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toEqual({ number: 2 })
    expect(asked).toContain("/api/project/participants/individual/10%2F01")
  })

  it("asks the list even for a placed leader – their travel choice lives only there", async () => {
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants/individual/1001": [
        Response.json({ participation_type: "Rundresa", troop: "1" }),
      ],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toEqual({ number: 1 })
    expect(user?.travel).toBe("rundresa")
    expect(asked).toContain("/api/project/participants/individual/1001")
  })

  it("keeps the roles' unit when the list disagrees", async () => {
    // The role is the appointment, the list a reading of it.
    networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants/individual/1001": [Response.json({ troop: "2" })],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toEqual({ number: 1 })
    expect(user?.mark).toEqual({ isLeader: true, unitNumber: 1 })
    expect(user?.roleLineWithUnit).toBe("Ledare · Avdelning 1")
  })

  it("names the unit the list supplied for a leader whose role carried none", async () => {
    networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ roles: ["wsj27:al"] }))],
      "/api/project/participants/individual/1001": [Response.json({ troop: "2" })],
    })

    const user = await currentUser(testClient())

    // The mark and the line agree: a starred unit 2 beside "Ledare · Avdelning 2".
    expect(user?.mark).toEqual({ isLeader: true, unitNumber: 2 })
    expect(user?.roleLine).toBe("Ledare")
    expect(user?.roleLineWithUnit).toBe("Ledare · Avdelning 2")
  })

  it("does not remember a service it could not reach as nothing known", async () => {
    const client = rememberingClient()
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({})), Response.json(userPayload({}))],
      // The first ask meets a dead network; the second is answered.
      "/api/project/participants/individual/1001": [],
    })

    const first = await currentUser(client)
    expect(first?.travel).toBeUndefined()

    networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants/individual/1001": [
        Response.json({ participation_type: "Rundresa", troop: "1" }),
      ],
    })
    const second = await currentUser(client)

    expect(asked).toContain("/api/project/participants/individual/1001")
    expect(second?.travel).toBe("rundresa")
  })

  it("remembers a refusal, which asking again would not change", async () => {
    const client = rememberingClient()
    networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants/individual/1001": [new Response("{}", { status: 403 })],
    })
    await currentUser(client)

    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants/individual/1001": [Response.json({ troop: "1" })],
    })
    await currentUser(client)

    expect(asked).toEqual(["/api/auth/user"])
  })
})

describe("keeping the session alive", () => {
  it("adds the keep-alive script once, however often it is asked", () => {
    const scripts: unknown[] = []
    vi.stubGlobal("document", {
      body: {
        append: (node: unknown) => {
          scripts.push(node)
        },
      },
      createElement: () => ({ src: "" }),
    })

    keepSessionAlive()
    keepSessionAlive()

    expect(scripts).toEqual([{ src: "/api/auth/static/refresh.js" }])
  })
})

describe("asking only where a session can exist", () => {
  it("asks when the refresh window is open, however long ago the token lapsed", async () => {
    browserWith(`theme=dark; wsj27-auth_refresh-expires-at=${String(Date.now() + 86_400_000)}`)
    const asked = networkAnswers({
      "/api/auth/refresh": [Response.json({})],
      "/api/auth/user": [new Response("{}", { status: 401 }), Response.json(userPayload({}))],
    })

    await expect(currentUser(testClient())).resolves.toMatchObject({ name: "Lars Larsson" })
    expect(asked.slice(0, 3)).toEqual(["/api/auth/user", "/api/auth/refresh", "/api/auth/user"])
  })

  it("asks when a token was minted in the last five minutes", async () => {
    browserWith(`wsj27-auth_expires-at=${String(Date.now() + 60_000)}`)
    networkAnswers({ "/api/auth/user": [Response.json(userPayload({ memberNo: "3003" }))] })

    await expect(currentUser(testClient())).resolves.toMatchObject({ memberNo: "3003" })
  })

  it("still asks when neither cookie is readable, since the refresh window may be open", async () => {
    browserWith("theme=dark")
    const asked = networkAnswers({
      "/api/auth/refresh": [new Response("{}", { status: 401 })],
      "/api/auth/user": [new Response("{}", { status: 401 })],
    })

    await expect(currentUser(testClient())).resolves.toBeUndefined()
    expect(asked).toEqual(["/api/auth/user", "/api/auth/refresh"])
  })
})

describe("signing out", () => {
  it("leaves for the sign-out round trip, carrying the address to come back to", () => {
    const visited = navigationAnswers()

    signOut("http://localhost:8000/")

    expect(visited).toHaveLength(1)
    expect(queryOf(visited[0]!, "/api/auth/logout").get("redirect_uri")).toBe(
      "http://localhost:8000/",
    )
  })
})
