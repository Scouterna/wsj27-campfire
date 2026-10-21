import { describe, expect, it } from "vitest"

import { cases as seededCases } from "../../seed/cases.ts"
import { createApp } from "../app.ts"
import { mintAccessToken } from "../auth/tokens.ts"
import { generateSigningKey } from "../keys.ts"
import { Browser, origin, signIn } from "../testing/browser.ts"
import { clock, type Clock } from "../testing/clock.ts"

const key = generateSigningKey()

interface Mock {
  readonly app: ReturnType<typeof createApp>
  readonly time: Clock
  /**
   * The health persona's access token, minted by signing in on this app's clock.
   */
  readonly token: string
}

interface Sent {
  readonly body?: BodyInit | undefined
  readonly contentType?: string
  /**
   * The token to send, or undefined to send none.
   */
  readonly token: string | undefined
}

interface WireCase {
  readonly about_person_id: number | null
  readonly assigned_to_id: number | null
  readonly closed: boolean
  readonly closed_at: string | null
  readonly closed_by_id: number | null
  readonly extra_access: number[]
  readonly id: number
  readonly latest_note_at: string | null
  readonly secrecy_level: number
  readonly tags: string[]
  readonly title: string
}

interface WireNote {
  readonly id: number
  readonly secrecy_level: number
  readonly title: string
}

// The seeded cases beside the health team's, whose ids run from the closed one at 1.
const cmtCase = 4
const unitCase = 5

const notAnInteger = "Input should be a valid integer, unable to parse string as an integer"

// Every test starts its own mock, so the cases it writes are its own.
async function start(): Promise<Mock> {
  const time = clock()
  const app = createApp({ key, now: time.now })
  return { app, time, token: await tokenFor({ app, time, token: "" }, "health@wsj.se") }
}

async function tokenFor(mock: Mock, email: string): Promise<string> {
  const browser = new Browser(mock.app, mock.time.now)
  await signIn(browser, email)
  return browser.cookie("wsj27-auth_access-token") ?? ""
}

// A token for someone no persona is, with exactly these roles.
function minted(mock: Mock, roles: readonly string[], memberNo: string): string {
  return mintAccessToken({}, roles, memberNo, key, mock.time.now()).token
}

// Sends as the health persona unless told otherwise, and a body as JSON unless told otherwise.
async function send(mock: Mock, method: string, path: string, sent?: Sent): Promise<Response> {
  const headers = new Headers()
  const cookie = sent === undefined ? mock.token : sent.token
  if (cookie !== undefined) {
    headers.set("Cookie", `wsj27-auth_access-token=${cookie}`)
  }
  const init: RequestInit = { headers, method }
  if (sent?.body !== undefined) {
    headers.set("Content-Type", sent.contentType ?? "application/json")
    init.body = sent.body
  }
  return mock.app.request(`${origin}/api/project${path}`, init)
}

async function statusOf(sending: Promise<Response>): Promise<number> {
  const response = await sending
  return response.status
}

async function textOf(sending: Promise<Response>): Promise<string> {
  const response = await sending
  return response.text()
}

async function post(
  mock: Mock,
  path: string,
  body?: unknown,
  token = mock.token,
): Promise<Response> {
  const text = body === undefined ? undefined : JSON.stringify(body)
  return send(mock, "POST", path, { body: text, token })
}

async function put(mock: Mock, path: string, body: unknown, token = mock.token): Promise<Response> {
  return send(mock, "PUT", path, { body: JSON.stringify(body), token })
}

async function get(mock: Mock, path: string, token = mock.token): Promise<Response> {
  return send(mock, "GET", path, { token })
}

async function json<T>(response: Response, status = 200): Promise<T> {
  expect(response.status).toBe(status)
  return (await response.json()) as T
}

async function listedIds(mock: Mock, query = "", token = mock.token): Promise<number[]> {
  const records = await json<WireCase[]>(await get(mock, `/cases${query}`, token))
  return records.map((record) => record.id)
}

async function noteTitles(mock: Mock, caseId: number, token = mock.token): Promise<string[]> {
  const notes = await json<WireNote[]>(await get(mock, `/cases/${String(caseId)}/notes`, token))
  return notes.map((note) => note.title)
}

async function openCase(mock: Mock, fields: object = {}, token = mock.token): Promise<WireCase> {
  const body = { about_person_id: 1_300_077, title: "Feber", troop: "1", type: "hälsa", ...fields }
  return json<WireCase>(await post(mock, "/cases", body, token), 201)
}

async function writeNote(
  mock: Mock,
  caseId: number,
  title: string,
  fields: object = {},
  token = mock.token,
): Promise<Response> {
  return post(mock, `/cases/${String(caseId)}/notes`, { note: title, title, ...fields }, token)
}

describe("the seeded cases", () => {
  it("lists the open ones the health team reaches newest first, byte for byte", async () => {
    const mock = await start()
    const response = await get(mock, "/cases")

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/json")
    expect(await response.text()).toBe(
      `[{"id":4,"created_at":"2026-09-20T19:00:00Z","creator_id":1200401,"secrecy_level":3,"title":"Tidig hemresa","type":"cmt","about_person_id":1300252,"assigned_to_id":null,"troop":"2","latest_note_at":"2026-09-21T05:30:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]},{"id":3,"created_at":"2026-09-20T12:45:00Z","creator_id":1200001,"secrecy_level":3,"title":"Feber","type":"hälsa","about_person_id":1300140,"assigned_to_id":null,"troop":"2","latest_note_at":"2026-09-20T18:00:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]},{"id":2,"created_at":"2026-09-20T07:30:00Z","creator_id":1200001,"secrecy_level":3,"title":"Allergisk reaktion","type":"hälsa","about_person_id":1300035,"assigned_to_id":null,"troop":"1","latest_note_at":"2026-09-20T11:00:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]}]`,
    )
  })

  it("adds the closed one only when asked", async () => {
    const mock = await start()
    const all = await json<WireCase[]>(await get(mock, "/cases?include_closed=true"))

    expect(all.map((record) => record.id)).toEqual([4, 3, 2, 1])
    expect(all[3]).toMatchObject({
      closed: true,
      closed_at: "2026-09-20T07:00:00Z",
      closed_by_id: 1_200_001,
      title: "Stukad fot",
    })
  })

  it("lists the head of contingent's case to the contingent management, byte for byte", async () => {
    const mock = await start()
    const response = await get(mock, "/cases", await tokenFor(mock, "hoc@wsj.se"))

    expect(await response.text()).toBe(
      `[{"id":4,"created_at":"2026-09-20T19:00:00Z","creator_id":1200401,"secrecy_level":3,"title":"Tidig hemresa","type":"cmt","about_person_id":1300252,"assigned_to_id":null,"troop":"2","latest_note_at":"2026-09-21T05:30:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]}]`,
    )
  })

  it("lists unit 1's case to its leaders, byte for byte", async () => {
    const mock = await start()
    const response = await get(mock, "/cases", await tokenFor(mock, "leader-1@wsj.se"))

    expect(await response.text()).toBe(
      `[{"id":5,"created_at":"2026-09-21T07:00:00Z","creator_id":1100101,"secrecy_level":3,"title":"Hemlängtan","type":"avdelning","about_person_id":1300084,"assigned_to_id":null,"troop":"1","latest_note_at":"2026-09-21T07:00:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]}]`,
    )
  })

  it.each([
    ["health@wsj.se", [cmtCase, 3, 2, 1]],
    ["hoc@wsj.se", [cmtCase]],
    ["health-grant@wsj.se", [cmtCase]],
    ["leader-1@wsj.se", [unitCase]],
    ["leader-2@wsj.se", []],
  ])("lets %s reach only %j", async (email, expected) => {
    const mock = await start()
    const token = await tokenFor(mock, email)

    expect(await listedIds(mock, "?include_closed=1", token)).toEqual(expected)
  })

  it("serves a case's notes newest first, byte for byte", async () => {
    const mock = await start()
    const response = await get(mock, "/cases/2/notes")

    expect(await response.text()).toBe(
      `[{"id":5,"case_id":2,"created_at":"2026-09-20T11:00:00Z","creator_id":1200001,"secrecy_level":3,"title":"Köket har svarat","note":"Brödet var penslat med ägg. Köket märker upp det framöver, och Ester äter från allergibordet tills vidare."` +
        `,"tags":[]},{"id":4,"case_id":2,"created_at":"2026-09-20T08:15:00Z","creator_id":1200001,"secrecy_level":3,"title":"Uppföljning","note":"Utslagen har bleknat. Köket tar reda på vad som fanns i frukostbrödet.","tags":[]},{"id":3,"case_id":2,"created_at":"2026-09-20T07:30:00Z","creator_id":1200001,"secrecy_level":3,"title":"Allergisk reaktion","note":"Ester fick klåda och röda utslag på armarna efter frukosten. Ingen andningspåverkan, så EpiPen behövdes inte. Hon tog sin antihistamin.","tags":[]}]`,
    )
  })

  it("writes each case's notes as its creator, at its level", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")
    const notes = await json<{ creator_id: number; secrecy_level: number }[]>(
      await get(mock, `/cases/${String(cmtCase)}/notes`, hoc),
    )

    expect(notes).toEqual([
      expect.objectContaining({ creator_id: 1_200_401, secrecy_level: 3 }),
      expect.objectContaining({ creator_id: 1_200_401, secrecy_level: 3 }),
    ])
  })

  it("is about deltagare in the troop the list of participants gives them", async () => {
    const mock = await start()

    for (const seeded of seededCases) {
      const response = await get(mock, `/participants/individual/${seeded.aboutMemberNo}`)
      const person = await json<{ member_type: string; troop: string }>(response)
      expect(person).toMatchObject({ member_type: "Deltagare", troop: seeded.troop })
    }
  })

  it("keeps each app's writes to itself", async () => {
    const first = await start()
    const second = await start()
    await openCase(first)

    expect(await listedIds(first)).toHaveLength(4)
    expect(await listedIds(second)).toHaveLength(3)
  })
})

describe("the case types", () => {
  it.each([
    ["health@wsj.se", '["hälsa","cmt"]'],
    ["hoc@wsj.se", '["cmt"]'],
    ["health-grant@wsj.se", '["cmt"]'],
    ["leader-1@wsj.se", '["avdelning"]'],
  ])("gives %s the types %s", async (email, expected) => {
    const mock = await start()
    const token = await tokenFor(mock, email)

    expect(await textOf(get(mock, "/cases/types", token))).toBe(expected)
  })

  it.each([
    ["a role that names no case type", ["wsj27:legacy-access:Intern information"]],
    ["a leader role that names no troop", ["wsj27:al"]],
  ])("refuses all of /cases to %s", async (_name, roles) => {
    const mock = await start()
    const token = minted(mock, roles, "1300035")
    const refusals = [
      await get(mock, "/cases/types", token),
      await get(mock, "/cases?about_person_id=x", token),
      await post(mock, "/cases", { title: 1 }, token),
      await post(mock, "/cases/abc/notes", { title: 1 }, token),
      await get(mock, "/cases/99/access", token),
      await put(mock, "/cases/1/title", { title: "" }, token),
    ]

    for (const response of refusals) {
      expect(response.status).toBe(403)
      expect(await response.text()).toBe('{"detail":"No access to cases"}')
    }
  })

  it("refuses someone with no project role before asking about cases", async () => {
    const mock = await start()
    const outsider = await tokenFor(mock, "outsider@wsj.se")
    const response = await get(mock, "/cases/types", outsider)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('{"detail":"No suitable roles"}')
  })

  it("reads the body before refusing a caller with no case type", async () => {
    const mock = await start()
    const token = minted(mock, ["wsj27:legacy-access:Intern information"], "1300035")

    expect(await statusOf(send(mock, "POST", "/cases", { body: "{", token }))).toBe(422)
  })
})

describe("opening a case", () => {
  it("answers 201 with the case, dated by the clock and written by the caller", async () => {
    const mock = await start()
    mock.time.advance(250)
    const response = await post(mock, "/cases", {
      about_person_id: 1_300_077,
      title: "Feber",
      troop: "1",
      type: "hälsa",
    })

    expect(response.status).toBe(201)
    expect(await response.text()).toBe(
      `{"id":6,"created_at":"2027-07-30T08:00:00.250000Z","creator_id":1200001,"secrecy_level":3,"title":"Feber","type":"hälsa","about_person_id":1300077,"assigned_to_id":null,"troop":"1","latest_note_at":null,"closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]}`,
    )
  })

  it("lists a new case first, and its first note moves its latest note", async () => {
    const mock = await start()
    const created = await openCase(mock)
    mock.time.advance(60_000)
    const note = await json<WireNote>(await writeNote(mock, created.id, "Första"), 201)

    expect(note).toMatchObject({ id: 11, secrecy_level: 3 })
    const [newest] = await json<WireCase[]>(await get(mock, "/cases"))
    expect(newest).toMatchObject({ id: created.id, latest_note_at: "2027-07-30T08:01:00Z" })
  })

  it("keeps the optional fields it is given, and lax integers become integers", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: '{"about_person_id": " 12 ", "extra_access": [1, "2", true, 3.0], "secrecy_level": "5", "tags": ["akut"], "title": "t", "troop": "", "type": "cmt"}',
      token: mock.token,
    })

    expect(await json(response, 201)).toMatchObject({
      about_person_id: 12,
      extra_access: [1, 2, 1, 3],
      secrecy_level: 5,
      tags: ["akut"],
    })
  })

  it("refuses a type the service does not know, after validation", async () => {
    const mock = await start()
    const response = await post(mock, "/cases", {
      secrecy_level: true,
      title: "a",
      troop: "1",
      type: "x",
    })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe('{"detail":"Invalid case type: x"}')
  })

  it.each([
    ["hoc@wsj.se", "hälsa", "1", "No access to hälsa cases for 1"],
    ["leader-1@wsj.se", "avdelning", "2", "No access to avdelning cases for 2"],
    ["leader-1@wsj.se", "cmt", "1", "No access to cmt cases for 1"],
  ])("refuses %s a %s case for troop %s", async (email, type, troop, refusal) => {
    const mock = await start()
    const token = await tokenFor(mock, email)
    const response = await post(
      mock,
      "/cases",
      { secrecy_level: 1, title: "t", troop, type },
      token,
    )

    expect(response.status).toBe(403)
    expect(await response.text()).toBe(JSON.stringify({ detail: refusal }))
  })

  it("opens a unit's case about one of its deltagare, or about the unit itself", async () => {
    const mock = await start()
    const leader = await tokenFor(mock, "leader-1@wsj.se")
    const about = await openCase(mock, { type: "avdelning" }, leader)
    // Left out of the body, which the service reads as its null.
    const unit = await openCase(mock, { about_person_id: undefined, type: "avdelning" }, leader)

    expect(about).toMatchObject({ about_person_id: 1_300_077, creator_id: 1_100_101 })
    expect(unit.about_person_id).toBeNull()
  })

  it.each([
    ["in another troop", "1300140"],
    ["missing from the list", "99"],
    ["past any member number", "100000000000000000000"],
    ["negative", "-1"],
  ])("refuses a unit's case about someone %s, before its level", async (_name, member) => {
    const mock = await start()
    const leader = await tokenFor(mock, "leader-1@wsj.se")
    const response = await send(mock, "POST", "/cases", {
      body: `{"about_person_id": ${member}, "secrecy_level": 1, "title": "t", "troop": "1", "type": "avdelning"}`,
      token: leader,
    })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(`{"detail":"Member ${member} is not in troop 1"}`)
  })

  it("refuses the levels not in use, and extra access on a level 4 case", async () => {
    const mock = await start()
    const levelTwo = await post(mock, "/cases", {
      secrecy_level: 2,
      title: "t",
      troop: "1",
      type: "cmt",
    })
    const levelFour = await post(mock, "/cases", {
      extra_access: [1_100_101],
      secrecy_level: 4,
      title: "t",
      troop: "1",
      type: "cmt",
    })

    expect(levelTwo.status).toBe(422)
    expect(await levelTwo.text()).toBe('{"detail":"Secrecy levels 1 and 2 are not in use yet"}')
    expect(levelFour.status).toBe(422)
    expect(await levelFour.text()).toBe(
      '{"detail":"A secrecy level 4 case cannot have extra_access"}',
    )
    expect(await openCase(mock, { secrecy_level: 4 })).toMatchObject({ secrecy_level: 4 })
  })

  it("collects every field's refusal in declaration order", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: '{"secrecy_level": 0, "title": 1, "type": "x", "troop": null, "extra_access": ["a", 1.5, true, "2", 1e20], "tags": "x"}',
      token: mock.token,
    })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      `{"detail":[{"type":"greater_than_equal","loc":["body","secrecy_level"],"msg":"Input should be greater than or equal to 1","input":0,"ctx":{"ge":1}},{"type":"string_type","loc":["body","title"],"msg":"Input should be a valid string","input":1},{"type":"string_type","loc":["body","troop"],"msg":"Input should be a valid string","input":null},{"type":"int_parsing","loc":["body","extra_access",0],"msg":"${notAnInteger}","input":"a"},{"type":"int_from_float","loc":["body","extra_access",1],"msg":"Input should be a valid integer, got a number with a fractional part","input":1.5},{"type":"int_parsing_size","loc":["body","extra_access",4],"msg":"Unable to parse input string as an integer, exceeded maximum size","input":1e+20},{"type":"list_type","loc":["body","tags"],"msg":"Input should be a valid list","input":"x"}]}`,
    )
  })

  it("echoes what was sent, not what it became", async () => {
    const mock = await start()
    const falseLevel = await send(mock, "POST", "/cases", {
      body: '{"secrecy_level": false, "title": {}, "type": [], "troop": "1", "extra_access": [null, {}, 1.0, false], "tags": [1, null]}',
      token: mock.token,
    })
    const tooSecret = await post(mock, "/cases", {
      secrecy_level: 6,
      title: "a",
      troop: "1",
      type: "x",
    })

    expect(await falseLevel.text()).toBe(
      `{"detail":[{"type":"greater_than_equal","loc":["body","secrecy_level"],"msg":"Input should be greater than or equal to 1","input":false,"ctx":{"ge":1}},{"type":"string_type","loc":["body","title"],"msg":"Input should be a valid string","input":{}},{"type":"string_type","loc":["body","type"],"msg":"Input should be a valid string","input":[]},{"type":"int_type","loc":["body","extra_access",0],"msg":"Input should be a valid integer","input":null},{"type":"int_type","loc":["body","extra_access",1],"msg":"Input should be a valid integer","input":{}},{"type":"string_type","loc":["body","tags",0],"msg":"Input should be a valid string","input":1},{"type":"string_type","loc":["body","tags",1],"msg":"Input should be a valid string","input":null}]}`,
    )
    expect(await tooSecret.text()).toBe(
      `{"detail":[{"type":"less_than_equal","loc":["body","secrecy_level"],"msg":"Input should be less than or equal to 5","input":6,"ctx":{"le":5}}]}`,
    )
  })

  it("refuses a missing field with the whole body as its input, in the body's own order", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: '{"b": 1.0, "2": 1e16, "c": 1e-7, "d": 12345678901234567890, "e": [1.5, true, null, {"x": 0.1}], "f": -0.0, "h": 1e15, "i": 123456789.123, "j": 1e-4, "k": 2.5e-5, "b": 2}',
      token: mock.token,
    })
    const echoed =
      '{"b":2,"2":1e+16,"c":1e-07,"d":12345678901234567890,"e":[1.5,true,null,{"x":0.1}],"f":-0.0,"h":1000000000000000.0,"i":123456789.123,"j":0.0001,"k":2.5e-05}'

    expect(await response.text()).toBe(
      `{"detail":[${["title", "type", "troop"]
        .map(
          (name) =>
            `{"type":"missing","loc":["body","${name}"],"msg":"Field required","input":${echoed}}`,
        )
        .join(",")}]}`,
    )
  })

  it.each([
    ["no body", undefined],
    ["null", "null"],
  ])("refuses %s as a missing body", async (_name, body) => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", { body, token: mock.token })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      '{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}',
    )
  })

  it.each([
    ["a list", "[]", "application/json", "[]"],
    ["text sent as text", '{"a":1}', "text/plain", String.raw`"{\"a\":1}"`],
    ["JSON under a type that is not JSON's", "{}", "text/json", '"{}"'],
  ])("refuses %s as not an object", async (_name, body, contentType, input) => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", { body, contentType, token: mock.token })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      `{"detail":[{"type":"model_attributes_type","loc":["body"],"msg":"Input should be a valid dictionary or object to extract fields from","input":${input}}]}`,
    )
  })

  it.each(["application/vnd.api+json", "APPLICATION/JSON; charset=latin-1"])(
    "reads %s as JSON",
    async (contentType) => {
      const mock = await start()
      const body = '{"title": "t", "type": "hälsa", "troop": "1"}'

      expect(
        await statusOf(send(mock, "POST", "/cases", { body, contentType, token: mock.token })),
      ).toBe(201)
    },
  )

  it("answers 500 where the service fails past its checks", async () => {
    const mock = await start()
    const valid = { title: "t", troop: "1", type: "hälsa" }
    const failures = [
      await send(mock, "POST", "/cases", { body: "NaN", token: mock.token }),
      await send(mock, "POST", "/cases", { body: String.raw`{"a":"\ud800"}`, token: mock.token }),
      await send(mock, "POST", "/cases", {
        body: '{"title": "t", "type": "hälsa", "troop": "1", "about_person_id": 99999999999999999999}',
        token: mock.token,
      }),
      await post(mock, "/cases", { ...valid, title: "a\u{0}b" }),
      await send(mock, "POST", "/cases", {
        body: new Uint8Array([0xff]),
        contentType: "text/plain",
        token: mock.token,
      }),
    ]

    for (const response of failures) {
      expect(response.status).toBe(500)
      expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8")
      expect(await response.text()).toBe("Internal Server Error")
    }
    expect(await listedIds(mock)).toHaveLength(3)
  })

  it("answers 400 to JSON that is not UTF-8", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: new Uint8Array([0xff]),
      token: mock.token,
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toBe('{"detail":"There was an error parsing the body"}')
  })

  it("reads a byte-order mark as nothing", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", { body: "\u{FEFF}{}", token: mock.token })

    expect(await json<{ detail: unknown[] }>(response, 422)).toMatchObject({
      detail: [{ input: {}, type: "missing" }, {}, {}],
    })
  })
})

describe("a body that is not JSON", () => {
  it.each([
    [" ", 1, "Expecting value"],
    ["{", 1, "Expecting property name enclosed in double quotes"],
    ['{"a"', 4, "Expecting ':' delimiter"],
    ['{"a" 1}', 5, "Expecting ':' delimiter"],
    ['{"a":', 5, "Expecting value"],
    ['{"a":1', 6, "Expecting ',' delimiter"],
    ['{"a":1,', 7, "Expecting property name enclosed in double quotes"],
    ['{"a":1 , }', 7, "Illegal trailing comma before end of object"],
    ["[1 2]", 3, "Expecting ',' delimiter"],
    ["[1,]", 2, "Illegal trailing comma before end of array"],
    ['{"a":1}x', 7, "Extra data"],
    ["01", 1, "Extra data"],
    ["1.", 1, "Extra data"],
    ["tru", 0, "Expecting value"],
    ["-", 0, "Expecting value"],
    ['"abc', 0, "Unterminated string starting at"],
    ['"abc\\', 0, "Unterminated string starting at"],
    ['"a\u{1}"', 2, "Invalid control character at"],
    [String.raw`"\x"`, 1, String.raw`Invalid \escape`],
    [String.raw`"\u12"`, 2, String.raw`Invalid \uXXXX escape`],
    [String.raw`"\u0041`, 0, "Unterminated string starting at"],
  ])("refuses %j at %i: %s", async (body, position, error) => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", { body, token: mock.token })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      JSON.stringify({
        detail: [
          {
            type: "json_invalid",
            loc: ["body", position],
            msg: "JSON decode error",
            input: {},
            ctx: { error },
          },
        ],
      }),
    )
  })

  it("is refused before the token is looked at", async () => {
    const mock = await start()
    const bad = await send(mock, "POST", "/cases", { body: "{bad", token: undefined })
    const good = await send(mock, "POST", "/cases", { body: "{}", token: undefined })

    expect(bad.status).toBe(422)
    expect(good.status).toBe(401)
  })

  it("decodes every escape, and a surrogate pair as one character", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: String.raw`{"a":"\"\\\/\b\f\n\r\t\u00e5\ud83d\ude00", "b": [], "c": {}}`,
      token: mock.token,
    })
    const { detail } = await json<{ detail: { input: unknown }[] }>(response, 422)

    expect(detail[0]?.input).toEqual({ a: '"\\/\b\f\n\r\tå😀', b: [], c: {} })
  })
})

describe("who reaches a case", () => {
  it("answers a case of another type, or another unit, as if it did not exist", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")
    const leader = await tokenFor(mock, "leader-2@wsj.se")
    const refusals = [
      await get(mock, "/cases/2/notes", hoc),
      await post(mock, "/cases/1/reopen", undefined, hoc),
      await get(mock, `/cases/${String(unitCase)}/access`, leader),
      await post(mock, `/cases/${String(unitCase)}/close`, undefined, leader),
      await get(mock, `/cases/${String(unitCase)}/notes`),
    ]

    for (const response of refusals) {
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('{"detail":"Case not found"}')
    }
  })

  it("filters a listing first, and leaves out what the caller does not reach", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")

    expect(await listedIds(mock, "?troop=2", hoc)).toEqual([cmtCase])
    expect(await listedIds(mock, "?type=cmt")).toEqual([cmtCase])
    expect(await listedIds(mock, "?type=avdelning")).toEqual([])
  })

  it("lets a grantee in at level 3, to do what the case's roles do but pass access on", async () => {
    const mock = await start()
    const leader = await tokenFor(mock, "leader-1@wsj.se")
    await put(mock, "/cases/2/extra_access", { extra_access: [1_100_101] })
    const path = "/cases/2"

    expect(await listedIds(mock, "", leader)).toEqual([unitCase, 2])
    expect(await statusOf(writeNote(mock, 2, "Från ledaren", {}, leader))).toBe(201)
    expect(await statusOf(put(mock, `${path}/title`, { title: "Ägg" }, leader))).toBe(200)
    expect(await statusOf(put(mock, `${path}/tags`, { tags: ["allergi"] }, leader))).toBe(200)
    expect(await statusOf(put(mock, `${path}/notes/3/tags`, { tags: ["kök"] }, leader))).toBe(200)
    const passed = await put(mock, `${path}/extra_access`, { extra_access: [7] }, leader)
    const levelFour = await writeNote(mock, 2, "Hemligt", { secrecy_level: 4 }, leader)
    for (const response of [passed, levelFour]) {
      expect(response.status).toBe(403)
      expect(await response.text()).toBe('{"detail":"Only the case type\'s own roles may do this"}')
    }
    expect(await statusOf(post(mock, `${path}/close`, undefined, leader))).toBe(200)
    expect(await statusOf(post(mock, `${path}/reopen`, undefined, leader))).toBe(200)
  })

  it("keeps a level 4 case to its roles, and a level 5 case to its creator and grantees", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")
    const admin = await tokenFor(mock, "admin@wsj.se")
    const leader = await tokenFor(mock, "leader-1@wsj.se")
    const levelFour = await openCase(mock, { secrecy_level: 4, type: "cmt" }, hoc)
    const levelFive = await openCase(
      mock,
      { extra_access: [1_100_101], secrecy_level: 5, type: "cmt" },
      hoc,
    )

    expect(await listedIds(mock, "", admin)).toEqual([levelFour.id, cmtCase])
    expect(await listedIds(mock, "", leader)).toEqual([levelFive.id, unitCase])
    expect(await listedIds(mock, "", hoc)).toEqual([levelFive.id, levelFour.id, cmtCase])
    const refused = await put(
      mock,
      `/cases/${String(levelFour.id)}/extra_access`,
      { extra_access: [1_200_201] },
      hoc,
    )
    expect(await refused.text()).toBe(
      '{"detail":"A secrecy level 4 case cannot have extra_access"}',
    )
    const emptied = put(
      mock,
      `/cases/${String(levelFour.id)}/extra_access`,
      { extra_access: [] },
      hoc,
    )
    expect(await statusOf(emptied)).toBe(200)
  })

  it("answers 500 where a rule needs a member number the token does not carry", async () => {
    const mock = await start()
    const token = minted(mock, ["wsj27:cmt:support:halsa"], "")
    const body = JSON.stringify({ note: "n", title: "t" })

    expect(await statusOf(get(mock, "/cases/types", token))).toBe(200)
    expect(await statusOf(get(mock, "/cases/2/access", token))).toBe(200)
    expect(await statusOf(post(mock, "/cases/1/reopen", undefined, token))).toBe(200)
    expect(await statusOf(get(mock, "/cases", token))).toBe(500)
    expect(await statusOf(get(mock, "/cases/tags", token))).toBe(500)
    const unitNotes = `/cases/${String(unitCase)}/notes`
    expect(await statusOf(get(mock, unitNotes, token))).toBe(500)
    expect(await statusOf(post(mock, "/cases/2/close", undefined, token))).toBe(500)
    expect(await statusOf(get(mock, "/cases/2/notes", token))).toBe(500)
    expect(await statusOf(send(mock, "POST", "/cases/2/notes", { body, token }))).toBe(500)
  })
})

describe("who has access", () => {
  it.each([
    [2, "health@wsj.se", "[1200001]"],
    [
      cmtCase,
      "hoc@wsj.se",
      "[1200001,1200002,1200101,1200102,1200201,1200202,1200301,1200302,1200401]",
    ],
    [unitCase, "leader-1@wsj.se", "[1100101,1100402]"],
  ])("lists case %i's members to %s, ascending", async (caseId, email, expected) => {
    const mock = await start()
    const token = await tokenFor(mock, email)

    const path = `/cases/${String(caseId)}/access`
    expect(await textOf(get(mock, path, token))).toBe(expected)
  })

  it("adds the grantees who have some case type, and nobody the list lacks", async () => {
    const mock = await start()
    await put(mock, "/cases/2/extra_access", { extra_access: [1_300_035, 1_100_201, 99] })

    expect(await textOf(get(mock, "/cases/2/access"))).toBe("[1100201,1200001]")
  })

  it("leaves a level 5 case to its creator", async () => {
    const mock = await start()
    const created = await openCase(mock, { secrecy_level: 5 })
    const someoneElse = minted(mock, ["wsj27:cmt:support:halsa"], "1200999")

    const path = `/cases/${String(created.id)}/access`
    expect(await textOf(get(mock, path))).toBe("[1200001]")
    expect(await statusOf(get(mock, path, someoneElse))).toBe(404)
    expect(await listedIds(mock, "", someoneElse)).toEqual([cmtCase, 3, 2])
  })

  it("refuses a path that is not an id once, because only the dependency declares it", async () => {
    const mock = await start()

    expect(await textOf(get(mock, "/cases/abc/access"))).toBe(
      `{"detail":[{"type":"int_parsing","loc":["path","case_id"],"msg":"${notAnInteger}","input":"abc"}]}`,
    )
  })
})

describe("notes", () => {
  it("lists a case's notes newest first, the later of two at one moment first", async () => {
    const mock = await start()
    const created = await openCase(mock)
    await writeNote(mock, created.id, "Ett")
    await writeNote(mock, created.id, "Två")
    mock.time.advance(1000)
    await writeNote(mock, created.id, "Tre")

    expect(await noteTitles(mock, created.id)).toEqual(["Tre", "Två", "Ett"])
  })

  it("writes a note at its case's level unless told a higher one", async () => {
    const mock = await start()
    const inherited = await json<WireNote>(await writeNote(mock, 2, "a"), 201)
    const nulled = await json<WireNote>(
      await send(mock, "POST", "/cases/2/notes", {
        body: '{"note": "b", "secrecy_level": null, "title": "b"}',
        token: mock.token,
      }),
      201,
    )
    const higher = await json<WireNote>(await writeNote(mock, 2, "c", { secrecy_level: 5 }), 201)

    expect([inherited, nulled, higher].map((note) => note.secrecy_level)).toEqual([3, 3, 5])
  })

  it("refuses a note less secret than its case, to a closed case, and to no case", async () => {
    const mock = await start()
    const created = await openCase(mock, { secrecy_level: 5 })
    const lessSecret = await writeNote(mock, created.id, "n", { secrecy_level: 4 })
    const closed = await writeNote(mock, 1, "n")
    const missing = await writeNote(mock, 99, "n")

    expect(lessSecret.status).toBe(422)
    expect(await lessSecret.text()).toBe(
      `{"detail":"Note secrecy level must be equal or higher than the case's secrecy level"}`,
    )
    expect(closed.status).toBe(409)
    expect(await closed.text()).toBe('{"detail":"Case is closed"}')
    expect(missing.status).toBe(404)
    expect(await missing.text()).toBe('{"detail":"Case not found"}')
    expect(await statusOf(get(mock, "/cases/99/notes"))).toBe(404)
  })

  it("keeps a note above its case's level from those it is not for", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")
    const admin = await tokenFor(mock, "admin@wsj.se")
    const leader = await tokenFor(mock, "leader-1@wsj.se")
    const path = `/cases/${String(cmtCase)}`
    await put(mock, `${path}/extra_access`, { extra_access: [1_100_101] }, hoc)
    await writeNote(mock, cmtCase, "Roller", { secrecy_level: 4, tags: ["fyra"] }, hoc)
    await writeNote(mock, cmtCase, "Egen", { secrecy_level: 5, tags: ["fem"] }, hoc)

    expect(await noteTitles(mock, cmtCase, hoc)).toEqual([
      "Egen",
      "Roller",
      "Ombokning",
      "Tidig hemresa",
    ])
    expect(await noteTitles(mock, cmtCase, admin)).toEqual(["Roller", "Ombokning", "Tidig hemresa"])
    expect(await noteTitles(mock, cmtCase, leader)).toEqual(["Ombokning", "Tidig hemresa"])
    expect(await json(await get(mock, "/cases/tags", hoc))).toEqual(["fem", "fyra"])
    expect(await json(await get(mock, "/cases/tags", admin))).toEqual(["fyra"])
    expect(await json(await get(mock, "/cases/tags", leader))).toEqual([])
    const hidden = await put(mock, `${path}/notes/12/tags`, { tags: [] }, admin)
    expect(hidden.status).toBe(404)
    expect(await hidden.text()).toBe('{"detail":"Note not found"}')
  })

  it("answers a missing or closed case before it validates the body", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")

    expect(await textOf(post(mock, "/cases/1/notes", { title: 1 }))).toBe(
      '{"detail":"Case is closed"}',
    )
    expect(await textOf(post(mock, "/cases/99/notes", { title: 1 }))).toBe(
      '{"detail":"Case not found"}',
    )
    expect(await textOf(post(mock, "/cases/2/notes", undefined, hoc))).toBe(
      '{"detail":"Case not found"}',
    )
  })

  it("refuses a bad path twice, once for the dependency and once for the route, beside the body", async () => {
    const mock = await start()
    const response = await post(mock, "/cases/abc/notes", { secrecy_level: 9 })
    const pathError = `{"type":"int_parsing","loc":["path","case_id"],"msg":"${notAnInteger}","input":"abc"}`

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      `{"detail":[${pathError},${pathError},{"type":"less_than_equal","loc":["body","secrecy_level"],"msg":"Input should be less than or equal to 5","input":9,"ctx":{"le":5}},{"type":"missing","loc":["body","title"],"msg":"Field required","input":{"secrecy_level":9}},{"type":"missing","loc":["body","note"],"msg":"Field required","input":{"secrecy_level":9}}]}`,
    )
    expect(await json(await get(mock, "/cases/abc/notes"), 422)).toMatchObject({
      detail: [{ loc: ["path", "case_id"] }, { loc: ["path", "case_id"] }],
    })
  })

  it("refuses a missing body, and a level that is not a number", async () => {
    const mock = await start()
    const noBody = await post(mock, "/cases/2/notes")
    const wordy = await writeNote(mock, 2, "t", { secrecy_level: "fem" })

    expect(await json(noBody, 422)).toMatchObject({ detail: [{ loc: ["body"], type: "missing" }] })
    expect(await json(wordy, 422)).toEqual({
      detail: [
        {
          type: "int_parsing",
          loc: ["body", "secrecy_level"],
          msg: notAnInteger,
          input: "fem",
        },
      ],
    })
  })
})

describe("closing and reopening", () => {
  it("closes an open case as the caller, and refuses to close it twice", async () => {
    const mock = await start()
    mock.time.advance(90_000)
    const closed = await json<WireCase>(await post(mock, "/cases/2/close"))
    const again = await post(mock, "/cases/2/close")

    expect(closed).toMatchObject({
      closed: true,
      closed_at: "2027-07-30T08:01:30Z",
      closed_by_id: 1_200_001,
    })
    expect(again.status).toBe(409)
    expect(await again.text()).toBe('{"detail":"Case is closed"}')
    expect(await listedIds(mock)).toEqual([4, 3])
  })

  it("reopens a closed case, and refuses to reopen an open one", async () => {
    const mock = await start()
    const reopened = await json<WireCase>(await post(mock, "/cases/1/reopen"))
    const again = await post(mock, "/cases/1/reopen")

    expect(reopened.closed).toBe(false)
    expect(reopened.closed_at).toBeNull()
    expect(reopened.closed_by_id).toBeNull()
    expect(again.status).toBe(409)
    expect(await again.text()).toBe('{"detail":"Case is not closed"}')
  })

  it("freezes a closed case, refusing a change before it reads the body", async () => {
    const mock = await start()
    const changes = [
      await put(mock, "/cases/1/title", { title: "" }),
      await put(mock, "/cases/1/tags", { tags: "x" }),
      await put(mock, "/cases/1/assignee", {}),
      await put(mock, "/cases/1/extra_access", { extra_access: [] }),
      await put(mock, "/cases/1/notes/y/tags", { tags: [] }),
    ]

    for (const response of changes) {
      expect(response.status).toBe(409)
      expect(await response.text()).toBe('{"detail":"Case is closed"}')
    }
  })

  it("answers 404 for a case that does not exist, and reads the id as pydantic does", async () => {
    const mock = await start()

    for (const path of ["/cases/99/close", "/cases/99/reopen", "/cases/9_9/close"]) {
      const response = await post(mock, path)
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('{"detail":"Case not found"}')
    }
    expect(await statusOf(post(mock, "/cases/2.00/close"))).toBe(200)
    const pathError = `{"type":"int_parsing","loc":["path","case_id"],"msg":"${notAnInteger}","input":"abc"}`
    expect(await textOf(post(mock, "/cases/abc/close"))).toBe(
      `{"detail":[${pathError},${pathError}]}`,
    )
    const tooLarge = `/cases/${String(2n ** 63n)}/close`
    expect(await statusOf(post(mock, tooLarge))).toBe(500)
  })
})

describe("the listing", () => {
  it.each([
    [[["about_person_id", "1300035"]], [2]],
    [[["about_person_id", " 1300035 "]], [2]],
    [[["troop", "2"]], [4, 3]],
    [[["type", "general"]], []],
    [
      [
        ["type", "hälsa"],
        ["include_closed", "yes"],
      ],
      [3, 2, 1],
    ],
    [[["not_older_than", "2026-09-20T08:00:00+02:00"]], [4, 3, 2]],
    [
      [
        ["not_older_than", "2026-09-20T09:30:00+02:00"],
        ["include_closed", "on"],
      ],
      [4, 3, 2],
    ],
    [[["not_older_than", "2026-09-20T09:30:00.000001+02:00"]], [4, 3]],
    [[["not_older_than", "2026-09-20 12:45Z"]], [4, 3]],
    [[["not_older_than", "2026-09-20t10:45-0200"]], [4, 3]],
    [[["not_older_than", "2026-09-20"]], [4, 3, 2]],
    [[["not_older_than", "2026-09-21"]], []],
    [[["not_older_than", String(Date.UTC(2026, 8, 20, 12, 45) / 1000)]], [4, 3]],
    [[["not_older_than", String(Date.UTC(2026, 8, 20, 12, 45))]], [4, 3]],
    [[["not_older_than", `${String(Date.UTC(2026, 8, 20, 12, 45) / 1000)}.5`]], [4]],
    [
      [
        ["include_closed", "nope"],
        ["include_closed", "TRUE"],
      ],
      [4, 3, 2, 1],
    ],
    [[["include_closed", "0"]], [4, 3, 2]],
  ])("filters %j to %j", async (query, expected) => {
    const mock = await start()

    expect(await listedIds(mock, `?${new URLSearchParams(query).toString()}`)).toEqual(expected)
  })

  it("filters by tag", async () => {
    const mock = await start()
    await put(mock, "/cases/2/tags", { tags: ["allergi"] })

    expect(await listedIds(mock, "?tag=allergi")).toEqual([2])
  })

  it("collects every refusal in the order the parameters are declared", async () => {
    const mock = await start()
    const response = await get(mock, "/cases?include_closed=x&not_older_than=x&about_person_id=x")

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      `{"detail":[{"type":"int_parsing","loc":["query","about_person_id"],"msg":"${notAnInteger}","input":"x"},{"type":"datetime_from_date_parsing","loc":["query","not_older_than"],"msg":"Input should be a valid datetime or date, input is too short","input":"x","ctx":{"error":"input is too short"}},{"type":"bool_parsing","loc":["query","include_closed"],"msg":"Input should be a valid boolean, unable to interpret input","input":"x"}]}`,
    )
  })

  it.each([
    ["2027-7-30", "input is too short"],
    ["abcdefghijk", "invalid character in year"],
    ["2027/07/30", "invalid date separator, expected `-`"],
    ["2027-0x-30", "invalid character in month"],
    ["2027-07/30", "invalid date separator, expected `-`"],
    ["2027-07-3x", "invalid character in day"],
    ["2027-13-01", "month value is outside expected range of 1-12"],
    ["2027-02-29", "day value is outside expected range"],
    ["2027-07-00", "day value is outside expected range"],
    ["2027-07-30X", "unexpected extra characters at the end of the input"],
    ["2027-07-30T08", "unexpected extra characters at the end of the input"],
    ["2027-07-30T25:00", "unexpected extra characters at the end of the input"],
    ["2027-07-30T08:00:00.", "unexpected extra characters at the end of the input"],
    ["2027-07-30T08:00:00+24:00", "unexpected extra characters at the end of the input"],
  ])("refuses the datetime %j: %s", async (sent, error) => {
    const mock = await start()
    const response = await get(mock, `/cases?not_older_than=${encodeURIComponent(sent)}`)

    expect(await json(response, 422)).toEqual({
      detail: [
        {
          type: "datetime_from_date_parsing",
          loc: ["query", "not_older_than"],
          msg: `Input should be a valid datetime or date, ${error}`,
          input: sent,
          ctx: { error },
        },
      ],
    })
  })

  it("accepts a leap day, and refuses year 0 as a datetime", async () => {
    const mock = await start()
    const leap = await get(mock, "/cases?not_older_than=2028-02-29")
    const yearZero = await get(mock, "/cases?not_older_than=0000-01-01")

    expect(await json(leap)).toEqual([])
    expect(await yearZero.text()).toBe(
      `{"detail":[{"type":"datetime_parsing","loc":["query","not_older_than"],"msg":"Input should be a valid datetime, year 0 is out of range","input":"0000-01-01","ctx":{"error":"year 0 is out of range"}}]}`,
    )
  })

  it("answers 500 for a filter the database refuses", async () => {
    const mock = await start()
    const largest = 2n ** 63n - 1n
    const tooLarge = get(mock, `/cases?about_person_id=${String(largest + 1n)}`)
    const large = get(mock, `/cases?about_person_id=${String(largest)}`)

    expect(await statusOf(tooLarge)).toBe(500)
    expect(await statusOf(large)).toBe(200)
  })
})

describe("replacing a field", () => {
  it("replaces a case's tags, title, access, and assignee, and a note's tags", async () => {
    const mock = await start()
    const tagged = await json<WireCase>(
      await put(mock, "/cases/2/tags", { tags: ["b", "A", "ä", "_"] }),
    )
    const titled = await json<WireCase>(await put(mock, "/cases/2/title", { title: "Ägg" }))
    const access = await json<WireCase>(
      await put(mock, "/cases/2/extra_access", { extra_access: [1_100_101, "1100201"] }),
    )
    const assigned = await json<WireCase>(
      await put(mock, "/cases/2/assignee", { assigned_to_id: 1_100_101 }),
    )
    const unassigned = await json<WireCase>(
      await send(mock, "PUT", "/cases/2/assignee", {
        body: '{"assigned_to_id": null}',
        token: mock.token,
      }),
    )
    const noteTags = await json<{ tags: string[] }>(
      await put(mock, "/cases/2/notes/3/tags", { tags: ["akut"] }),
    )

    expect(tagged.tags).toEqual(["b", "A", "ä", "_"])
    expect(titled.title).toBe("Ägg")
    expect(access.extra_access).toEqual([1_100_101, 1_100_201])
    expect(assigned.assigned_to_id).toBe(1_100_101)
    expect(unassigned.assigned_to_id).toBeNull()
    expect(noteTags.tags).toEqual(["akut"])
    expect(await json(await get(mock, "/cases/tags"))).toEqual(["A", "_", "akut", "b", "ä"])
  })

  it.each(["1200401", "99", "100000000000000000000"])(
    "refuses to assign a case to %s, who cannot open it",
    async (member) => {
      const mock = await start()
      const response = await send(mock, "PUT", "/cases/2/assignee", {
        body: `{"assigned_to_id": ${member}}`,
        token: mock.token,
      })

      expect(response.status).toBe(422)
      expect(await response.text()).toBe(`{"detail":"Member ${member} has no access to this case"}`)
    },
  )

  it("refuses an empty title, and one that is not text", async () => {
    const mock = await start()
    const empty = await put(mock, "/cases/2/title", { title: "" })
    const numeric = await put(mock, "/cases/2/title", { title: 5 })

    expect(await empty.text()).toBe(
      '{"detail":[{"type":"string_too_short","loc":["body","title"],"msg":"String should have at least 1 character","input":"","ctx":{"min_length":1}}]}',
    )
    expect(await numeric.text()).toBe(
      '{"detail":[{"type":"string_type","loc":["body","title"],"msg":"Input should be a valid string","input":5}]}',
    )
  })

  it("refuses a missing field, and a case or a note that does not exist", async () => {
    const mock = await start()
    const missing = await put(mock, "/cases/2/assignee", {})
    const noCase = await put(mock, "/cases/99/tags", { tags: [] })
    const noNote = await put(mock, "/cases/3/notes/1/tags", { tags: [] })

    expect(await missing.text()).toBe(
      '{"detail":[{"type":"missing","loc":["body","assigned_to_id"],"msg":"Field required","input":{}}]}',
    )
    expect(await noCase.text()).toBe('{"detail":"Case not found"}')
    expect(noNote.status).toBe(404)
    expect(await noNote.text()).toBe('{"detail":"Note not found"}')
  })

  it("collects both path parameters and the body into one refusal, the case id twice", async () => {
    const mock = await start()
    const response = await put(mock, "/cases/x/notes/y/tags", { tags: [1] })
    const reached = await send(mock, "PUT", "/cases/2/notes/y/tags", { token: mock.token })

    expect(await json(response, 422)).toMatchObject({
      detail: [
        { loc: ["path", "case_id"] },
        { loc: ["path", "case_id"] },
        { loc: ["path", "note_id"] },
        { loc: ["body", "tags", 0], type: "string_type" },
      ],
    })
    expect(await json(reached, 422)).toMatchObject({
      detail: [{ loc: ["path", "note_id"] }, { loc: ["body"], type: "missing" }],
    })
  })

  it("answers 500 for a value the database refuses", async () => {
    const mock = await start()
    const failures = [
      put(mock, "/cases/2/title", { title: "a\u{0}b" }),
      put(mock, "/cases/2/tags", { tags: ["a\u{0}b"] }),
      put(mock, "/cases/2/notes/3/tags", { tags: ["a\u{0}b"] }),
      send(mock, "PUT", "/cases/2/extra_access", {
        body: '{"extra_access": [9223372036854775808]}',
        token: mock.token,
      }),
      send(mock, "PUT", "/cases/2/notes/9223372036854775808/tags", {
        body: '{"tags": []}',
        token: mock.token,
      }),
    ]

    for (const failure of failures) {
      expect(await statusOf(failure)).toBe(500)
    }
  })
})

describe("the tags", () => {
  it("lists no tags until one is set, and then in code-point order", async () => {
    const mock = await start()

    expect(await textOf(get(mock, "/cases/tags"))).toBe("[]")
    await put(mock, "/cases/2/tags", { tags: ["😀", "！", "z"] })
    expect(await json(await get(mock, "/cases/tags"))).toEqual(["z", "！", "😀"])
  })

  it("lists only the tags of the cases the caller reaches", async () => {
    const mock = await start()
    const hoc = await tokenFor(mock, "hoc@wsj.se")
    await put(mock, "/cases/2/tags", { tags: ["hälsa"] })
    await put(mock, `/cases/${String(cmtCase)}/tags`, { tags: ["resa"] }, hoc)

    expect(await json(await get(mock, "/cases/tags", hoc))).toEqual(["resa"])
    expect(await json(await get(mock, "/cases/tags"))).toEqual(["hälsa", "resa"])
  })
})

describe("who is asking", () => {
  it.each([
    ["GET", "/cases"],
    ["POST", "/cases/1/close"],
    ["POST", "/cases/1/reopen"],
    ["GET", "/cases/1/notes"],
    ["GET", "/cases/1/access"],
    ["PUT", "/cases/1/title"],
    ["GET", "/cases/tags"],
    ["GET", "/cases/types"],
    ["POST", "/cases/abc/close"],
  ])("refuses %s %s without a token, before validating", async (method, path) => {
    const mock = await start()
    const response = await send(mock, method, path, { token: undefined })

    expect(response.status).toBe(401)
    expect(await response.text()).toBe('{"detail":"Unauthorized"}')
  })
})

describe("routing", () => {
  it.each([
    ["DELETE", "/cases", "POST"],
    ["PUT", "/cases", "POST"],
    ["PATCH", "/cases/1/notes", "POST"],
    ["GET", "/cases/1/close", "POST"],
    ["GET", "/cases/1/reopen", "POST"],
    ["POST", "/cases/1/access", "GET"],
    ["GET", "/cases/1/tags", "PUT"],
    ["GET", "/cases/1/title", "PUT"],
    ["GET", "/cases/1/assignee", "PUT"],
    ["GET", "/cases/1/extra_access", "PUT"],
    ["GET", "/cases/1/notes/2/tags", "PUT"],
    ["PUT", "/cases/tags", "GET"],
    ["POST", "/cases/types", "GET"],
  ])("answers %s %s with 405, allowing %s", async (method, path, allowed) => {
    const mock = await start()
    const response = await send(mock, method, path)

    expect(response.status).toBe(405)
    expect(response.headers.get("Allow")).toBe(allowed)
    expect(await response.text()).toBe('{"detail":"Method Not Allowed"}')
  })

  it.each([
    ["GET", "/cases/1"],
    ["GET", "/cases/1/nope/"],
    ["GET", "/cases/1/notes/2"],
    ["PUT", "/cases/1/notes/2/extra_access"],
  ])("answers %s %s, which the service does not declare, with 404", async (method, path) => {
    const mock = await start()
    const response = await send(mock, method, path)

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('{"detail":"Not Found"}')
  })

  it("redirects a trailing slash to the path without it, at the root of the origin as dev does", async () => {
    const mock = await start()
    const list = await get(mock, "/cases/")
    const notes = await send(mock, "POST", "/cases/1/notes//?a=b")
    const access = await get(mock, "/cases/1/access/")

    expect(list.status).toBe(307)
    expect(list.headers.get("Location")).toBe("http://localhost:8000/cases")
    expect(notes.status).toBe(307)
    expect(notes.headers.get("Location")).toBe("http://localhost:8000/cases/1/notes?a=b")
    expect(access.headers.get("Location")).toBe("http://localhost:8000/cases/1/access")
  })
})
