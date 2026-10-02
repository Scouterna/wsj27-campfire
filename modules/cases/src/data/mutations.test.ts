import { afterEach, describe, expect, it, vi } from "vitest"

import { addNote, closeCase, createCase, reopenCase } from "./mutations"

/**
 * A case as the cases service answers a write with it.
 */
function caseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    created_at: "2026-09-26T12:05:00+00:00",
    creator_id: 1_100_101,
    title: "Feber",
    about_person_id: 1_100_111,
    troop: "1",
    closed: false,
    ...overrides,
  }
}

/**
 * A note as the cases service answers a write with it.
 */
const noteRow = {
  id: 3,
  case_id: 7,
  created_at: "2026-09-26T12:05:01+00:00",
  creator_id: 1_100_101,
  title: "Feber",
  note: "38,5 på morgonen.",
}

/**
 * One request as the stand-in saw it: the address, the method, and the decoded body.
 */
interface Sent {
  readonly body?: unknown
  readonly method?: string
  readonly url: string
}

/**
 * Stands in for the platform's `fetch`, answering each request with the next body in
 * line, and returns what was sent.
 */
function networkAnswers(...answers: readonly Response[]): readonly Sent[] {
  const sent: Sent[] = []
  const remaining = [...answers]
  vi.stubGlobal("fetch", (url: string, init?: RequestInit): Promise<Response> => {
    sent.push({
      url,
      ...(init?.method !== undefined && { method: init.method }),
      ...(typeof init?.body === "string" && { body: JSON.parse(init.body) as unknown }),
    })
    const answer = remaining.shift()
    return answer === undefined
      ? Promise.reject(new TypeError("Load failed"))
      : Promise.resolve(answer)
  })
  return sent
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("opening a case", () => {
  const person = { memberNo: "1100111", name: "Ester Dahl", troop: "1" }

  it("opens a health case about the person, as secret as the service allows", async () => {
    const sent = networkAnswers(Response.json(caseRow(), { status: 201 }))

    const opened = await createCase({ person, title: "Feber" })

    expect(opened.id).toBe("7")
    expect(sent).toEqual([
      {
        url: "/api/project/cases",
        method: "POST",
        body: {
          about_person_id: 1_100_111,
          secrecy_level: 5,
          title: "Feber",
          troop: "1",
          type: "hälsa",
        },
      },
    ])
  })

  it("sends an empty troop for somebody without a unit", async () => {
    const sent = networkAnswers(Response.json(caseRow({ troop: "" }), { status: 201 }))

    await createCase({ person: { memberNo: "41", name: "Pernilla Palm" }, title: "Huvudvärk" })

    expect(sent[0]?.body).toMatchObject({ about_person_id: 41, troop: "" })
  })

  it("fails when the service's answer is not a case", async () => {
    networkAnswers(Response.json({ id: 7 }, { status: 201 }))

    await expect(createCase({ person, title: "Feber" })).rejects.toThrow(
      "/api/project/cases answered with something that is not readable",
    )
  })
})

describe("writing on a case", () => {
  it("posts the note under its title, as secret as its case", async () => {
    const sent = networkAnswers(Response.json(noteRow, { status: 201 }))

    const note = await addNote("7", "38,5 på morgonen.", "Feber")

    expect(note).toMatchObject({ caseId: "7", text: "38,5 på morgonen." })
    expect(sent[0]).toEqual({
      url: "/api/project/cases/7/notes",
      method: "POST",
      body: { note: "38,5 på morgonen.", secrecy_level: 5, title: "Feber" },
    })
  })

  it("fails with the refusal when the case is closed", async () => {
    networkAnswers(new Response("{}", { status: 409 }))

    await expect(addNote("7", "Bättre.", "Feber")).rejects.toMatchObject({ status: 409 })
  })
})

describe("closing and reopening a case", () => {
  it("closes a case and returns it closed", async () => {
    const sent = networkAnswers(
      Response.json(caseRow({ closed: true, closed_at: "2026-09-27T08:00:00+00:00" })),
    )

    const closed = await closeCase("7")

    expect(closed.isClosed).toBe(true)
    expect(sent).toEqual([{ url: "/api/project/cases/7/close", method: "POST" }])
  })

  it("reopens a case and returns it open", async () => {
    const sent = networkAnswers(Response.json(caseRow()))

    const reopened = await reopenCase("7")

    expect(reopened.isClosed).toBe(false)
    expect(sent).toEqual([{ url: "/api/project/cases/7/reopen", method: "POST" }])
  })

  it("encodes the case, so an address bar cannot rewrite the path", async () => {
    const sent = networkAnswers(Response.json(caseRow()))

    await reopenCase("7/../1")

    expect(sent[0]?.url).toBe("/api/project/cases/7%2F..%2F1/reopen")
  })
})
