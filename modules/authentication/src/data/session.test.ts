import type * as Utilities from "@scouterna/wsj27-campfire-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type * as Session from "./session"

/**
 * The session module, fresh for every test – its store is module state, so one test's
 * sign-in would otherwise be the next test's session.
 */
let session: typeof Session

/**
 * The utilities, loaded into the same fresh registry as the session, so the `HttpError`
 * a read throws is the class the session checks against.
 */
let utilities: typeof Utilities

beforeEach(async () => {
  vi.resetModules()
  session = await import("./session")
  utilities = await import("@scouterna/wsj27-campfire-utils")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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
 * A refusal, as the service answers one.
 */
function refused(): Response {
  return new Response("{}", { status: 401 })
}

/**
 * Settles the session on somebody, the state a signed-in application reads under.
 * @param memberNo The member number the service reports.
 */
async function signIn(memberNo = "1001"): Promise<void> {
  networkAnswers({ "/api/auth/user": [Response.json(userPayload({ memberNo }))] })
  await session.askAgain()
}

/**
 * Settles the session on nobody: the token refused, and the refresh refused too.
 */
async function signOut(): Promise<void> {
  networkAnswers({ "/api/auth/refresh": [refused()], "/api/auth/user": [refused()] })
  await session.askAgain()
}

/**
 * A read from a participants-service address, through the real `fetch`.
 */
function readProject(): Promise<unknown> {
  return utilities.fetch("/api/project/participants")
}

/**
 * The addresses under the auth service in what was asked.
 * @param asked What the network stub recorded.
 */
function authAsks(asked: readonly string[]): readonly string[] {
  return asked.filter((url) => url.startsWith("/api/auth/"))
}

describe("asking who is signed in", () => {
  it("shares one sequence of requests between callers that ask at once", async () => {
    const asked = networkAnswers({
      "/api/auth/refresh": [Response.json({})],
      "/api/auth/user": [refused(), Response.json(userPayload({}))],
    })

    const answers = await Promise.all([session.askAgain(), session.askAgain(), session.askAgain()])

    expect(asked).toEqual(["/api/auth/user", "/api/auth/refresh", "/api/auth/user"])
    expect(answers[1]).toBe(answers[0])
    expect(answers[2]).toBe(answers[0])
    expect(answers[0].kind).toBe("somebody")
  })

  it("answers somebody when the service reports a user", async () => {
    networkAnswers({ "/api/auth/user": [Response.json(userPayload({}))] })

    const answer = await session.askAgain()

    expect(answer.kind === "somebody" && answer.user.name).toBe("Lars Larsson")
  })

  it("answers nobody when the token and the refresh are both refused", async () => {
    networkAnswers({ "/api/auth/refresh": [refused()], "/api/auth/user": [refused()] })

    await expect(session.askAgain()).resolves.toEqual({ kind: "nobody" })
  })

  it("answers nobody when the refresh succeeds but the second ask still refuses", async () => {
    // The "refresh lied" path: a session revoked between the re-mint and the re-ask.
    networkAnswers({
      "/api/auth/refresh": [Response.json({})],
      "/api/auth/user": [refused(), refused()],
    })

    await expect(session.askAgain()).resolves.toEqual({ kind: "nobody" })
  })

  it("answers somebody when the refresh re-mints the token", async () => {
    networkAnswers({
      "/api/auth/refresh": [Response.json({})],
      "/api/auth/user": [refused(), Response.json(userPayload({ name: "Anna Andersson" }))],
    })

    const answer = await session.askAgain()

    expect(answer.kind === "somebody" && answer.user.name).toBe("Anna Andersson")
  })

  it("answers unreachable when the first ask meets a dead network", async () => {
    const asked = networkAnswers({})

    await expect(session.askAgain()).resolves.toEqual({ kind: "unreachable" })
    expect(asked).toEqual(["/api/auth/user"])
  })

  it("answers unreachable when the refresh meets a dead network", async () => {
    networkAnswers({ "/api/auth/user": [refused()] })

    await expect(session.askAgain()).resolves.toEqual({ kind: "unreachable" })
  })

  it("answers unreachable when the second ask meets a dead network", async () => {
    networkAnswers({ "/api/auth/refresh": [Response.json({})], "/api/auth/user": [refused()] })

    await expect(session.askAgain()).resolves.toEqual({ kind: "unreachable" })
  })

  it("answers unreachable on a server error, without asking for a refresh", async () => {
    const asked = networkAnswers({ "/api/auth/user": [new Response("{}", { status: 500 })] })

    await expect(session.askAgain()).resolves.toEqual({ kind: "unreachable" })
    expect(asked).toEqual(["/api/auth/user"])
  })

  it("answers unreachable when the answer is not JSON – a dev server with no service behind it", async () => {
    networkAnswers({ "/api/auth/user": [new Response("<!doctype html><html></html>")] })

    await expect(session.askAgain()).resolves.toEqual({ kind: "unreachable" })
  })

  it("answers unreachable when the payload is not a user", async () => {
    networkAnswers({ "/api/auth/user": [Response.json({})] })

    await expect(session.askAgain()).resolves.toEqual({ kind: "unreachable" })
  })
})

describe("remembering what the last ask settled on", () => {
  it("knows nothing before the first ask answers", () => {
    expect(session.sessionState()).toEqual({ kind: "unknown" })
  })

  it("keeps the previous state when the service could not be reached", async () => {
    await signIn()
    networkAnswers({})

    await session.askAgain()

    expect(session.sessionState().kind).toBe("somebody")
  })

  it("replaces somebody with nobody", async () => {
    await signIn()

    await signOut()

    expect(session.sessionState()).toEqual({ kind: "nobody" })
  })

  it("replaces nobody with somebody", async () => {
    await signOut()

    await signIn()

    expect(session.sessionState().kind).toBe("somebody")
  })
})

describe("telling subscribers who is signed in", () => {
  it("says the session ended once when somebody becomes nobody", async () => {
    await signIn()
    const changes: Session.SessionChange[] = []
    session.subscribeToSession((change) => {
      changes.push(change)
    })

    await signOut()

    expect(changes).toEqual([{ kind: "ended" }])
  })

  it("says the session changed hands, with the new user, when the member number differs", async () => {
    await signIn("1001")
    const changes: Session.SessionChange[] = []
    session.subscribeToSession((change) => {
      changes.push(change)
    })

    await signIn("2002")

    expect(changes).toHaveLength(1)
    expect(changes[0]?.kind === "changed" && changes[0].user.memberNo).toBe("2002")
  })

  it("says nothing when the same person is still signed in", async () => {
    await signIn()
    const changes: Session.SessionChange[] = []
    session.subscribeToSession((change) => {
      changes.push(change)
    })

    await signIn()

    expect(changes).toEqual([])
  })

  it("says nothing when the first answer is nobody", async () => {
    const changes: Session.SessionChange[] = []
    session.subscribeToSession((change) => {
      changes.push(change)
    })

    await signOut()

    expect(changes).toEqual([])
  })

  it("stops telling a subscriber that unsubscribed", async () => {
    await signIn()
    const changes: Session.SessionChange[] = []
    const unsubscribe = session.subscribeToSession((change) => {
      changes.push(change)
    })

    unsubscribe()
    await signOut()

    expect(changes).toEqual([])
  })

  it("has told the subscribers before a caller's await resumes", async () => {
    await signIn()
    const order: string[] = []
    session.subscribeToSession(() => {
      order.push("told")
    })
    networkAnswers({ "/api/auth/refresh": [refused()], "/api/auth/user": [refused()] })

    const first = (async () => {
      await session.askAgain()
      order.push("first resumed")
    })()
    const joiner = (async () => {
      await session.askAgain()
      order.push("joiner resumed")
    })()
    await Promise.all([first, joiner])

    expect(order).toEqual(["told", "first resumed", "joiner resumed"])
  })

  it("tells every subscriber even when one throws, and surfaces the throw on its own", async () => {
    await signIn()
    // Everything else queued keeps running; only what the session surfaces is caught.
    const surfaced: unknown[] = []
    const queue = queueMicrotask
    vi.stubGlobal("queueMicrotask", (task: () => void) => {
      queue(() => {
        try {
          task()
        } catch (error) {
          surfaced.push(error)
        }
      })
    })
    const changes: Session.SessionChange[] = []
    session.subscribeToSession(() => {
      throw new Error("A broken subscriber")
    })
    session.subscribeToSession((change) => {
      changes.push(change)
    })

    await signOut()

    expect(changes).toEqual([{ kind: "ended" }])
    await Promise.resolve()
    expect(surfaced).toEqual([new Error("A broken subscriber")])
  })
})

describe("running a read under the session", () => {
  it("runs the read once more when the same person is still signed in", async () => {
    await signIn()
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants": [refused(), Response.json(["Lars"])],
    })

    await expect(session.withSession(readProject)).resolves.toEqual(["Lars"])
    expect(asked.filter((url) => url === "/api/project/participants")).toHaveLength(2)
  })

  it("rethrows the refusal when nobody is signed in any more", async () => {
    await signIn()
    const asked = networkAnswers({
      "/api/auth/refresh": [refused()],
      "/api/auth/user": [refused()],
      "/api/project/participants": [refused()],
    })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 401 })
    expect(asked.filter((url) => url === "/api/project/participants")).toHaveLength(1)
  })

  it("rethrows the refusal when someone else is signed in now", async () => {
    await signIn("1001")
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({ memberNo: "2002" }))],
      "/api/project/participants": [refused()],
    })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 401 })
    expect(asked.filter((url) => url === "/api/project/participants")).toHaveLength(1)
  })

  it("rethrows the refusal when the auth service could not be reached", async () => {
    await signIn()
    const asked = networkAnswers({ "/api/project/participants": [refused()] })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 401 })
    expect(asked.filter((url) => url === "/api/project/participants")).toHaveLength(1)
  })

  it("rethrows a refusal of the second read without asking again", async () => {
    await signIn()
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({})), Response.json(userPayload({}))],
      "/api/project/participants": [refused(), refused()],
    })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 401 })
    expect(asked.filter((url) => url === "/api/auth/user")).toHaveLength(1)
  })

  it("leaves a dead network to the read, without asking", async () => {
    await signIn()
    const asked = networkAnswers({})

    await expect(session.withSession(readProject)).rejects.toThrow(
      "Could not reach /api/project/participants",
    )
    expect(authAsks(asked)).toEqual([])
  })

  it("leaves a 403 to the read, without asking", async () => {
    await signIn()
    const asked = networkAnswers({
      "/api/project/participants": [new Response("{}", { status: 403 })],
    })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 403 })
    expect(authAsks(asked)).toEqual([])
  })

  it("leaves a 404 to the read, without asking", async () => {
    await signIn()
    const asked = networkAnswers({
      "/api/project/participants": [new Response("{}", { status: 404 })],
    })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 404 })
    expect(authAsks(asked)).toEqual([])
  })

  it("refuses to read once the session has ended", async () => {
    await signOut()
    const read = vi.fn(readProject)

    await expect(session.withSession(read)).rejects.toThrow(Error)
    expect(read).not.toHaveBeenCalled()
  })

  it("refuses an answer that arrived after the session ended", async () => {
    await signIn()
    networkAnswers({ "/api/auth/refresh": [refused()], "/api/auth/user": [refused()] })
    // The read outlives the session: the ask that ends it settles while the read is
    // still in flight.
    const read = async (): Promise<string> => {
      await session.askAgain()
      return "late"
    }

    await expect(session.withSession(read)).rejects.toThrow(Error)
  })

  it("reads and rethrows a refusal without asking before any ask has answered", async () => {
    const asked = networkAnswers({ "/api/project/participants": [refused()] })

    await expect(session.withSession(readProject)).rejects.toMatchObject({ status: 401 })
    expect(asked).toEqual(["/api/project/participants"])
  })

  it("shares one ask between reads refused at once", async () => {
    await signIn()
    const asked = networkAnswers({
      "/api/auth/user": [Response.json(userPayload({}))],
      "/api/project/participants": [
        refused(),
        refused(),
        Response.json(["Lars"]),
        Response.json(["Lars"]),
      ],
    })

    const values = await Promise.all([
      session.withSession(readProject),
      session.withSession(readProject),
    ])

    expect(values).toEqual([["Lars"], ["Lars"]])
    expect(authAsks(asked)).toEqual(["/api/auth/user"])
  })
})
