import { afterEach, describe, expect, it, vi } from "vitest"

import {
  addNote,
  assignCase,
  attachPicture,
  closeCase,
  createCase,
  renameCase,
  reopenCase,
  shareCase,
} from "./mutations"

/**
 * A case as the cases service answers a write with it.
 */
function caseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    created_at: "2026-09-26T12:05:00+00:00",
    creator_id: 1_100_101,
    secrecy_level: 3,
    title: "Feber",
    type: "hälsa",
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
  secrecy_level: 3,
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
      ...(init?.body instanceof FormData && { body: init.body }),
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
  const health = { type: "hälsa" } as const

  it("opens a case of the chosen type, leaving the default level to the service", async () => {
    const sent = networkAnswers(Response.json(caseRow(), { status: 201 }))

    const opened = await createCase({ level: 3, person, scope: health, title: "Feber" })

    expect(opened.id).toBe("7")
    expect(sent).toEqual([
      {
        url: "/api/project/cases",
        method: "POST",
        body: { about_person_id: 1_100_111, title: "Feber", troop: "1", type: "hälsa" },
      },
    ])
  })

  it("sends a level only when it is not the default", async () => {
    const sent = networkAnswers(Response.json(caseRow({ secrecy_level: 5 }), { status: 201 }))

    await createCase({ level: 5, person, scope: health, title: "Feber" })

    expect(sent[0]?.body).toMatchObject({ secrecy_level: 5 })
  })

  it("keeps a unit's case for its unit", async () => {
    const sent = networkAnswers(Response.json(caseRow({ type: "avdelning" }), { status: 201 }))
    const scope = { type: "avdelning", unitNumber: 7 } as const

    await createCase({ level: 3, person, scope, title: "Hemlängtan" })

    expect(sent[0]?.body).toMatchObject({ troop: "7", type: "avdelning" })
  })

  it("files any other case under its person's unit, and empty for somebody without one", async () => {
    const sent = networkAnswers(Response.json(caseRow({ troop: "", type: "cmt" }), { status: 201 }))
    const nobody = { memberNo: "41", name: "Pernilla Palm" }

    await createCase({ level: 3, person: nobody, scope: { type: "cmt" }, title: "Pass" })

    expect(sent[0]?.body).toMatchObject({ about_person_id: 41, troop: "", type: "cmt" })
  })

  it("fails when the service's answer is not a case", async () => {
    networkAnswers(Response.json({ id: 7 }, { status: 201 }))

    await expect(createCase({ level: 3, person, scope: health, title: "Feber" })).rejects.toThrow(
      "/api/project/cases answered with something that is not readable",
    )
  })
})

describe("writing on a case", () => {
  it("posts the note under its title, leaving its level to its case", async () => {
    const sent = networkAnswers(Response.json(noteRow, { status: 201 }))

    const note = await addNote("7", "38,5 på morgonen.", "Feber")

    expect(note).toMatchObject({ caseId: "7", text: "38,5 på morgonen." })
    expect(sent[0]).toEqual({
      url: "/api/project/cases/7/notes",
      method: "POST",
      body: { note: "38,5 på morgonen.", title: "Feber" },
    })
  })

  it("sends a level only when one above the case's is asked for", async () => {
    const sent = networkAnswers(Response.json({ ...noteRow, secrecy_level: 5 }, { status: 201 }))

    const note = await addNote("7", "Ringde hem.", "Feber", 5)

    expect(note.secrecyLevel).toBe(5)
    expect(sent[0]?.body).toEqual({ note: "Ringde hem.", secrecy_level: 5, title: "Feber" })
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

describe("renaming a case", () => {
  it("puts the new title and returns the case under it", async () => {
    const sent = networkAnswers(Response.json(caseRow({ title: "Hög feber" })))

    const renamed = await renameCase("7", "Hög feber")

    expect(renamed.title).toBe("Hög feber")
    expect(sent).toEqual([
      { url: "/api/project/cases/7/title", method: "PUT", body: { title: "Hög feber" } },
    ])
  })
})

describe("sharing a case", () => {
  it("puts the whole list, as numbers, and returns the case shared with them", async () => {
    const sent = networkAnswers(Response.json(caseRow({ extra_access: [1_200_201, 1_200_401] })))

    const shared = await shareCase("7", ["1200201", "1200401"])

    expect(shared.extraAccess).toEqual(["1200201", "1200401"])
    expect(sent).toEqual([
      {
        url: "/api/project/cases/7/extra_access",
        method: "PUT",
        body: { extra_access: [1_200_201, 1_200_401] },
      },
    ])
  })
})

describe("attaching a picture", () => {
  it("posts the picture as a form under its file name, and reads where the stored one is", async () => {
    const sent = networkAnswers(
      Response.json({ id: 12, width: 2048, height: 1536, size: 412_000 }, { status: 201 }),
    )
    const picture = new File(["jpeg"], "utslag.jpg", { type: "image/jpeg" })

    const attachment = await attachPicture("7", "3", picture)

    expect(attachment).toEqual({
      height: 1536,
      id: "12",
      picture: "/api/project/cases/7/notes/3/attachments/12",
      thumbnail: "/api/project/cases/7/notes/3/attachments/12?thumbnail=true",
      width: 2048,
    })
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      method: "POST",
      url: "/api/project/cases/7/notes/3/attachments",
    })
    const form = sent[0]?.body
    expect(form instanceof FormData ? form.get("file") : undefined).toMatchObject({
      name: "utslag.jpg",
    })
  })

  it("fails naming the address when the answer is not a picture it can show", async () => {
    networkAnswers(Response.json({ id: 12 }, { status: 201 }))

    await expect(attachPicture("7", "3", new File(["x"], "x.jpg"))).rejects.toThrow(
      "/api/project/cases/7/notes/3/attachments answered with something that is not readable",
    )
  })
})

/**
 * The null the wire carries for nobody, parsed rather than written, because the code holds
 * absence as undefined and the lint refuses a null literal.
 */
const wireNull: unknown = JSON.parse("null")

describe("assigning a case", () => {
  it("names who is responsible by number, and nobody as the wire's null", async () => {
    const sent = networkAnswers(
      Response.json(caseRow({ assigned_to_id: 1_200_001 })),
      Response.json(caseRow()),
    )

    const assigned = await assignCase("7", "1200001")
    const cleared = await assignCase("7", undefined)

    expect(assigned.assigneeMemberNo).toBe("1200001")
    expect(cleared).not.toHaveProperty("assigneeMemberNo")
    expect(sent).toEqual([
      { body: { assigned_to_id: 1_200_001 }, method: "PUT", url: "/api/project/cases/7/assignee" },
      {
        body: { assigned_to_id: wireNull },
        method: "PUT",
        url: "/api/project/cases/7/assignee",
      },
    ])
  })
})
