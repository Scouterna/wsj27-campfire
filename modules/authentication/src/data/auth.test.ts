import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { currentUser, decodeUser, keepSessionAlive, signInUrl, signOut } from "./auth"

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
 * A fresh query client per test, so no unit answer cached by one test leaks into the
 * next. Retries are off and nothing lingers – the stubs decide every answer anyway.
 */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("reading the user the auth service reports", () => {
  it("decodes a payload it recognizes into the facts the application keeps", () => {
    const user = decodeUser(userPayload({}))

    expect(user).toEqual({
      firstName: "Lars",
      memberNo: "1001",
      name: "Lars Larsson",
      roles: [{ kind: "leader", unitNumber: 1 }],
      // A leader's unit comes straight from the roles, at the decode.
      unit: { number: 1 },
    })
  })

  it("degrades the optional fields rather than refusing the session", () => {
    const user = decodeUser({ user: { name: "Lars Larsson", roles: [] } })

    expect(user).toEqual({
      firstName: "Lars",
      memberNo: "",
      name: "Lars Larsson",
      roles: [],
    })
  })

  it("derives the greeting name from the full name when no given name arrives", () => {
    const user = decodeUser(userPayload({ givenName: undefined, name: "  Anna   Andersson " }))

    expect(user?.firstName).toBe("Anna")
  })

  it("greets nobody rather than crashing when the name is empty", () => {
    const user = decodeUser({ user: { name: "", roles: [] } })

    expect(user?.firstName).toBe("")
  })

  it("translates the spellings it knows and drops everything else", () => {
    const user = decodeUser(userPayload({ roles: ["wsj27:al:1", 42, "junk"] }))

    expect(user?.roles).toEqual([{ kind: "leader", unitNumber: 1 }])
  })

  it("keeps the unit from a leader role even when a management role sits beside it", () => {
    // The unit is what the application shapes itself around, so it survives whatever
    // else the person also is.
    const user = decodeUser(userPayload({ roles: ["wsj27:al:1", "wsj27:cmt:program"] }))

    expect(user?.unit).toEqual({ number: 1 })
    expect(user?.roles).toEqual([
      { kind: "leader", unitNumber: 1 },
      { kind: "cmt" },
      { kind: "program" },
    ])
  })

  it("reads a payload with no user as nobody", () => {
    expect(decodeUser({})).toBeUndefined()
  })

  it("reads a user that is not an object as nobody", () => {
    expect(decodeUser({ user: "Lars Larsson" })).toBeUndefined()
  })

  it("reads a user with no name as nobody", () => {
    expect(decodeUser({ user: { roles: [] } })).toBeUndefined()
  })

  it("reads a user with no roles as nobody", () => {
    // An empty list is a session; a missing list is a payload this module does not know.
    expect(decodeUser({ user: { name: "Lars Larsson" } })).toBeUndefined()
  })
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
  it("asks once when the first answer is a session", async () => {
    const asked = networkAnswers({ "/api/auth/user": [Response.json(userPayload({}))] })

    const user = await currentUser(testClient())

    expect(user?.name).toBe("Lars Larsson")
    expect(asked).toEqual(["/api/auth/user"])
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
    expect(asked).toEqual(["/api/auth/user", "/api/auth/refresh", "/api/auth/user"])
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

  it("answers nobody when nothing answers at all", async () => {
    const asked = networkAnswers({})

    const user = await currentUser(testClient())

    expect(user).toBeUndefined()
    expect(asked.filter((url) => url === "/api/auth/refresh")).toHaveLength(1)
  })

  it("answers nobody when the answer is not JSON – a dev server with no service behind it", async () => {
    networkAnswers({ "/api/auth/user": [new Response("<!doctype html><html></html>")] })

    await expect(currentUser(testClient())).resolves.toBeUndefined()
  })

  it("completes the unit from the register when the roles carry none", async () => {
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ roles: ["wsj27:cmt"] }))],
      "/api/project/participants/individual/1001": [Response.json({ troop: "2" })],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toEqual({ number: 2 })
    expect(asked).toContain("/api/project/participants/individual/1001")
  })

  it("answers a user without a unit when the register refuses", async () => {
    networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ roles: ["wsj27:cmt"] }))],
      "/api/project/participants/individual/1001": [new Response("{}", { status: 404 })],
    })

    const user = await currentUser(testClient())

    expect(user).toBeDefined()
    expect(user?.unit).toBeUndefined()
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

  it("never asks the register when the payload carried no member number", async () => {
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ memberNo: undefined, roles: ["wsj27:cmt"] }))],
    })

    const user = await currentUser(testClient())

    expect(user?.unit).toBeUndefined()
    expect(asked).toEqual(["/api/auth/user"])
  })

  it("asks the register at an encoded address when the member number carries a reserved character", async () => {
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

  it("never asks the register for a leader whose roles carry the unit", async () => {
    const asked = networkAnswers({ "/api/auth/user": [Response.json(userPayload({}))] })

    const user = await currentUser(testClient())

    expect(user?.unit).toEqual({ number: 1 })
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
