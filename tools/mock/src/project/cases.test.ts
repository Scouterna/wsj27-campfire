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
  readonly closed: boolean
  readonly closed_at: string | null
  readonly closed_by_id: number | null
  readonly id: number
  readonly latest_note_at: string | null
  readonly tags: string[]
  readonly title: string
}

interface WireNote {
  readonly id: number
  readonly title: string
}

// Every test starts its own mock, so the cases it writes are its own.
async function start(): Promise<Mock> {
  const time = clock()
  const app = createApp({ key, now: time.now })
  const browser = new Browser(app, time.now)
  await signIn(browser, "health@wsj.se")
  return { app, time, token: browser.cookie("wsj27-auth_access-token") ?? "" }
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

async function post(mock: Mock, path: string, body?: unknown): Promise<Response> {
  const text = body === undefined ? undefined : JSON.stringify(body)
  return send(mock, "POST", path, { body: text, token: mock.token })
}

async function put(mock: Mock, path: string, body: unknown): Promise<Response> {
  return send(mock, "PUT", path, { body: JSON.stringify(body), token: mock.token })
}

async function json<T>(response: Response, status = 200): Promise<T> {
  expect(response.status).toBe(status)
  return (await response.json()) as T
}

async function listed(mock: Mock, query = ""): Promise<WireCase[]> {
  return json<WireCase[]>(await send(mock, "GET", `/cases${query}`))
}

async function listedIds(mock: Mock, query = ""): Promise<number[]> {
  const records = await listed(mock, query)
  return records.map((record) => record.id)
}

async function openCase(mock: Mock, title = "Feber"): Promise<WireCase> {
  const body = { about_person_id: 1_300_077, secrecy_level: 5, title, troop: "1", type: "hälsa" }
  return json<WireCase>(await post(mock, "/cases", body), 201)
}

async function writeNote(mock: Mock, caseId: number, note: string): Promise<Response> {
  return post(mock, `/cases/${String(caseId)}/notes`, { note, secrecy_level: 5, title: note })
}

describe("the seeded cases", () => {
  it("lists the open ones newest first, byte for byte", async () => {
    const mock = await start()
    const response = await send(mock, "GET", "/cases")

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/json")
    expect(await response.text()).toBe(
      `[{"id":3,"created_at":"2026-09-20T12:45:00Z","creator_id":1200001,"secrecy_level":5,"title":"Feber","type":"hälsa","about_person_id":1300140,"assigned_to_id":null,"troop":"2","latest_note_at":"2026-09-20T18:00:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]},{"id":2,"created_at":"2026-09-20T07:30:00Z","creator_id":1200001,"secrecy_level":5,"title":"Allergisk reaktion","type":"hälsa","about_person_id":1300035,"assigned_to_id":null,"troop":"1","latest_note_at":"2026-09-20T11:00:00Z","closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]}]`,
    )
  })

  it("adds the closed one only when asked", async () => {
    const mock = await start()
    const all = await listed(mock, "?include_closed=true")

    expect(all.map((record) => record.id)).toEqual([3, 2, 1])
    expect(all[2]).toMatchObject({
      closed: true,
      closed_at: "2026-09-20T07:00:00Z",
      closed_by_id: 1_200_001,
      title: "Stukad fot",
    })
  })

  it("serves a case's notes newest first, byte for byte", async () => {
    const mock = await start()
    const response = await send(mock, "GET", "/cases/2/notes")

    expect(await response.text()).toBe(
      `[{"id":5,"case_id":2,"created_at":"2026-09-20T11:00:00Z","creator_id":1200001,"secrecy_level":5,"title":"Köket har svarat","note":"Brödet var penslat med ägg. Köket märker upp det framöver, och Ester äter från allergibordet tills vidare.","extra_access":[],"tags":[]},{"id":4,"case_id":2,"created_at":"2026-09-20T08:15:00Z","creator_id":1200001,"secrecy_level":5,"title":"Uppföljning","note":"Utslagen har bleknat. Köket tar reda på vad som fanns i frukostbrödet.","extra_access":[],"tags":[]},{"id":3,"case_id":2,"created_at":"2026-09-20T07:30:00Z","creator_id":1200001,"secrecy_level":5,"title":"Allergisk reaktion","note":"Ester fick klåda och röda utslag på armarna efter frukosten. Ingen andningspåverkan, så EpiPen behövdes inte. Hon tog sin antihistamin.","extra_access":[],"tags":[]}]`,
    )
  })

  it("is about deltagare in the troop the list of participants gives them", async () => {
    const mock = await start()

    for (const seeded of seededCases) {
      const response = await send(mock, "GET", `/participants/individual/${seeded.aboutMemberNo}`)
      const person = await json<{ member_type: string; troop: string }>(response)
      expect(person).toMatchObject({ member_type: "Deltagare", troop: seeded.troop })
    }
  })

  it("keeps each app's writes to itself", async () => {
    const first = await start()
    const second = await start()
    await openCase(first)

    expect(await listed(first)).toHaveLength(3)
    expect(await listed(second)).toHaveLength(2)
  })
})

describe("opening a case", () => {
  it("answers 201 with the case, dated by the clock and written by the caller", async () => {
    const mock = await start()
    mock.time.advance(250)
    const response = await post(mock, "/cases", {
      about_person_id: 1_300_077,
      secrecy_level: 5,
      title: "Feber",
      troop: "1",
      type: "hälsa",
    })

    expect(response.status).toBe(201)
    expect(await response.text()).toBe(
      `{"id":4,"created_at":"2027-07-30T08:00:00.250000Z","creator_id":1200001,"secrecy_level":5,"title":"Feber","type":"hälsa","about_person_id":1300077,"assigned_to_id":null,"troop":"1","latest_note_at":null,"closed":false,"closed_at":null,"closed_by_id":null,"extra_access":[],"tags":[]}`,
    )
  })

  it("lists a new case first, and its first note moves its latest note", async () => {
    const mock = await start()
    const created = await openCase(mock)
    mock.time.advance(60_000)
    const note = await json<WireNote>(await writeNote(mock, created.id, "Första"), 201)

    expect(note.id).toBe(8)
    const [newest] = await listed(mock)
    expect(newest).toMatchObject({ id: created.id, latest_note_at: "2027-07-30T08:01:00Z" })
  })

  it("keeps the optional fields it is given, and lax integers become integers", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: '{"about_person_id": " 12 ", "extra_access": [1, "2", true, 3.0], "secrecy_level": "3", "tags": ["akut"], "title": "t", "troop": "", "type": "admin"}',
      token: mock.token,
    })

    expect(await json(response, 201)).toMatchObject({
      about_person_id: 12,
      extra_access: [1, 2, 1, 3],
      secrecy_level: 3,
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

  it("collects every field's refusal in declaration order", async () => {
    const mock = await start()
    const response = await send(mock, "POST", "/cases", {
      body: '{"secrecy_level": 0, "title": 1, "type": "x", "troop": null, "extra_access": ["a", 1.5, true, "2", 1e20], "tags": "x"}',
      token: mock.token,
    })

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      `{"detail":[{"type":"greater_than_equal","loc":["body","secrecy_level"],"msg":"Input should be greater than or equal to 1","input":0,"ctx":{"ge":1}},{"type":"string_type","loc":["body","title"],"msg":"Input should be a valid string","input":1},{"type":"string_type","loc":["body","troop"],"msg":"Input should be a valid string","input":null},{"type":"int_parsing","loc":["body","extra_access",0],"msg":"Input should be a valid integer, unable to parse string as an integer","input":"a"},{"type":"int_from_float","loc":["body","extra_access",1],"msg":"Input should be a valid integer, got a number with a fractional part","input":1.5},{"type":"int_parsing_size","loc":["body","extra_access",4],"msg":"Unable to parse input string as an integer, exceeded maximum size","input":1e+20},{"type":"list_type","loc":["body","tags"],"msg":"Input should be a valid list","input":"x"}]}`,
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
      `{"detail":[${["secrecy_level", "title", "type", "troop"]
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
      const body = '{"secrecy_level": 5, "title": "t", "type": "hälsa", "troop": "1"}'

      expect(
        await statusOf(send(mock, "POST", "/cases", { body, contentType, token: mock.token })),
      ).toBe(201)
    },
  )

  it("answers 500 where the service fails past its checks", async () => {
    const mock = await start()
    const valid = { secrecy_level: 5, title: "t", troop: "1", type: "hälsa" }
    const failures = [
      await send(mock, "POST", "/cases", { body: "NaN", token: mock.token }),
      await send(mock, "POST", "/cases", { body: String.raw`{"a":"\ud800"}`, token: mock.token }),
      await send(mock, "POST", "/cases", {
        body: '{"secrecy_level": 5, "title": "t", "type": "hälsa", "troop": "1", "about_person_id": 99999999999999999999}',
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
    expect(await listed(mock)).toHaveLength(2)
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
      detail: [{ input: {}, type: "missing" }, {}, {}, {}],
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

describe("notes", () => {
  it("lists a case's notes newest first, the later of two at one moment first", async () => {
    const mock = await start()
    const created = await openCase(mock)
    await writeNote(mock, created.id, "Ett")
    await writeNote(mock, created.id, "Två")
    mock.time.advance(1000)
    await writeNote(mock, created.id, "Tre")
    const notes = await json<WireNote[]>(
      await send(mock, "GET", `/cases/${String(created.id)}/notes`),
    )

    expect(notes.map((note) => note.title)).toEqual(["Tre", "Två", "Ett"])
  })

  it("refuses a note to a closed case, one less secret than its case, and one to no case", async () => {
    const mock = await start()
    const lessSecret = await post(mock, "/cases/2/notes", {
      note: "n",
      secrecy_level: 4,
      title: "t",
    })
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
    expect(await statusOf(send(mock, "GET", "/cases/99/notes"))).toBe(404)
  })

  it("collects a bad path and a bad body into one refusal", async () => {
    const mock = await start()
    const response = await post(mock, "/cases/abc/notes", { secrecy_level: 9 })

    expect(await json(response, 422)).toMatchObject({
      detail: [
        { loc: ["path", "case_id"], type: "int_parsing" },
        { loc: ["body", "secrecy_level"], type: "less_than_equal" },
        { loc: ["body", "title"], type: "missing" },
        { loc: ["body", "note"], type: "missing" },
      ],
    })
  })
  it("refuses a missing body, a level that is not a number, and a path that is not an id", async () => {
    const mock = await start()
    const noBody = await post(mock, "/cases/2/notes")
    const wordy = await post(mock, "/cases/2/notes", {
      note: "n",
      secrecy_level: "fem",
      title: "t",
    })
    const badPath = await send(mock, "GET", "/cases/abc/notes")

    expect(await json(noBody, 422)).toMatchObject({ detail: [{ loc: ["body"], type: "missing" }] })
    expect(await json(wordy, 422)).toEqual({
      detail: [
        {
          type: "int_parsing",
          loc: ["body", "secrecy_level"],
          msg: "Input should be a valid integer, unable to parse string as an integer",
          input: "fem",
        },
      ],
    })
    expect(await json(badPath, 422)).toMatchObject({ detail: [{ loc: ["path", "case_id"] }] })
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
    expect(await again.text()).toBe('{"detail":"Case is already closed"}')
    expect(await listedIds(mock)).toEqual([3])
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

  it("answers 404 for a case that does not exist, and reads the id as pydantic does", async () => {
    const mock = await start()

    for (const path of ["/cases/99/close", "/cases/99/reopen", "/cases/9_9/close"]) {
      const response = await post(mock, path)
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('{"detail":"Case not found"}')
    }
    expect(await statusOf(post(mock, "/cases/2.00/close"))).toBe(200)
    const refused = await post(mock, "/cases/abc/close")
    expect(await refused.text()).toBe(
      `{"detail":[{"type":"int_parsing","loc":["path","case_id"],"msg":"Input should be a valid integer, unable to parse string as an integer","input":"abc"}]}`,
    )
  })
})

describe("the listing", () => {
  it.each([
    [[["about_person_id", "1300035"]], [2]],
    [[["about_person_id", " 1300035 "]], [2]],
    [[["troop", "2"]], [3]],
    [[["type", "general"]], []],
    [
      [
        ["type", "hälsa"],
        ["include_closed", "yes"],
      ],
      [3, 2, 1],
    ],
    [[["not_older_than", "2026-09-20T08:00:00+02:00"]], [3, 2]],
    [
      [
        ["not_older_than", "2026-09-20T09:30:00+02:00"],
        ["include_closed", "on"],
      ],
      [3, 2],
    ],
    [[["not_older_than", "2026-09-20T09:30:00.000001+02:00"]], [3]],
    [[["not_older_than", "2026-09-20 12:45Z"]], [3]],
    [[["not_older_than", "2026-09-20t10:45-0200"]], [3]],
    [[["not_older_than", "2026-09-20"]], [3, 2]],
    [[["not_older_than", "2026-09-21"]], []],
    [[["not_older_than", String(Date.UTC(2026, 8, 20, 12, 45) / 1000)]], [3]],
    [[["not_older_than", String(Date.UTC(2026, 8, 20, 12, 45))]], [3]],
    [[["not_older_than", `${String(Date.UTC(2026, 8, 20, 12, 45) / 1000)}.5`]], []],
    [
      [
        ["include_closed", "nope"],
        ["include_closed", "TRUE"],
      ],
      [3, 2, 1],
    ],
    [[["include_closed", "0"]], [3, 2]],
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
    const response = await send(
      mock,
      "GET",
      "/cases?include_closed=x&not_older_than=x&about_person_id=x",
    )

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(
      `{"detail":[{"type":"int_parsing","loc":["query","about_person_id"],"msg":"Input should be a valid integer, unable to parse string as an integer","input":"x"},{"type":"datetime_from_date_parsing","loc":["query","not_older_than"],"msg":"Input should be a valid datetime or date, input is too short","input":"x","ctx":{"error":"input is too short"}},{"type":"bool_parsing","loc":["query","include_closed"],"msg":"Input should be a valid boolean, unable to interpret input","input":"x"}]}`,
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
    const response = await send(mock, "GET", `/cases?not_older_than=${encodeURIComponent(sent)}`)

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
    const leap = await send(mock, "GET", "/cases?not_older_than=2028-02-29")
    const yearZero = await send(mock, "GET", "/cases?not_older_than=0000-01-01")

    expect(await json(leap)).toEqual([])
    expect(await yearZero.text()).toBe(
      `{"detail":[{"type":"datetime_parsing","loc":["query","not_older_than"],"msg":"Input should be a valid datetime, year 0 is out of range","input":"0000-01-01","ctx":{"error":"year 0 is out of range"}}]}`,
    )
  })

  it("answers 500 for a filter the database refuses", async () => {
    const mock = await start()
    const largest = 2n ** 63n - 1n
    const tooLarge = send(mock, "GET", `/cases?about_person_id=${String(largest + 1n)}`)
    const large = send(mock, "GET", `/cases?about_person_id=${String(largest)}`)

    expect(await statusOf(tooLarge)).toBe(500)
    expect(await statusOf(large)).toBe(200)
  })
})

describe("replacing a field", () => {
  it("replaces a case's tags, access, and assignee, and a note's tags and access", async () => {
    const mock = await start()
    const tagged = await json<WireCase>(
      await put(mock, "/cases/2/tags", { tags: ["b", "A", "ä", "_"] }),
    )
    const access = await json<{ extra_access: number[] }>(
      await put(mock, "/cases/2/extra_access", { extra_access: [1_100_101, "1100201"] }),
    )
    const assigned = await json<{ assigned_to_id: number }>(
      await put(mock, "/cases/2/assignee", { assigned_to_id: 1_200_002 }),
    )
    const unassigned = await json<{ assigned_to_id: null }>(
      await send(mock, "PUT", "/cases/2/assignee", {
        body: '{"assigned_to_id": null}',
        token: mock.token,
      }),
    )
    const noteTags = await json<{ tags: string[] }>(
      await put(mock, "/cases/2/notes/3/tags", { tags: ["akut"] }),
    )
    const noteAccess = await json<{ extra_access: number[] }>(
      await put(mock, "/cases/2/notes/3/extra_access", { extra_access: [7] }),
    )

    expect(tagged.tags).toEqual(["b", "A", "ä", "_"])
    expect(access.extra_access).toEqual([1_100_101, 1_100_201])
    expect(assigned.assigned_to_id).toBe(1_200_002)
    expect(unassigned.assigned_to_id).toBeNull()
    expect(noteTags.tags).toEqual(["akut"])
    expect(noteAccess.extra_access).toEqual([7])
    expect(await json(await send(mock, "GET", "/cases/tags"))).toEqual(["A", "_", "akut", "b", "ä"])
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

  it("collects both path parameters and the body into one refusal", async () => {
    const mock = await start()
    const response = await put(mock, "/cases/x/notes/y/tags", { tags: [1] })

    expect(await json(response, 422)).toMatchObject({
      detail: [
        { loc: ["path", "case_id"] },
        { loc: ["path", "note_id"] },
        { loc: ["body", "tags", 0], type: "string_type" },
      ],
    })
  })
})

describe("the tags and the types", () => {
  it("lists no tags until one is set, and the types in the service's order", async () => {
    const mock = await start()

    expect(await textOf(send(mock, "GET", "/cases/tags"))).toBe("[]")
    expect(await textOf(send(mock, "GET", "/cases/types"))).toBe('["hälsa","admin","avdelning"]')
  })
})

describe("who is asking", () => {
  it.each([
    ["GET", "/cases"],
    ["POST", "/cases/1/close"],
    ["POST", "/cases/1/reopen"],
    ["GET", "/cases/1/notes"],
    ["GET", "/cases/tags"],
    ["GET", "/cases/types"],
    ["POST", "/cases/abc/close"],
  ])("refuses %s %s without a token, before validating", async (method, path) => {
    const mock = await start()
    const response = await send(mock, method, path, { token: undefined })

    expect(response.status).toBe(401)
    expect(await response.text()).toBe('{"detail":"Unauthorized"}')
  })

  it("lets anyone with a project role do anything, because the service checks nothing more", async () => {
    const mock = await start()
    const browser = new Browser(mock.app, mock.time.now)
    await signIn(browser, "leader-1@wsj.se")
    const leader = browser.cookie("wsj27-auth_access-token")
    const response = await send(mock, "POST", "/cases/3/close", { token: leader })

    expect(await json(response)).toMatchObject({ closed_by_id: 1_100_101 })
  })

  it("answers 500 where it needs a member number the token does not carry", async () => {
    const mock = await start()
    const { token } = mintAccessToken({}, ["wsj27:cmt:support:halsa"], "", key, mock.time.now())

    expect(await statusOf(send(mock, "GET", "/cases", { token }))).toBe(200)
    expect(await statusOf(send(mock, "POST", "/cases/2/close", { token }))).toBe(500)
    expect(await statusOf(send(mock, "POST", "/cases/1/reopen", { token }))).toBe(200)
    expect(await statusOf(send(mock, "GET", "/cases/2/notes", { token }))).toBe(500)
    const body = JSON.stringify({ note: "n", secrecy_level: 5, title: "t" })
    expect(await statusOf(send(mock, "POST", "/cases/2/notes", { body, token }))).toBe(500)
  })
})

describe("routing", () => {
  it.each([
    ["DELETE", "/cases", "POST"],
    ["PUT", "/cases", "POST"],
    ["PATCH", "/cases/1/notes", "POST"],
    ["GET", "/cases/1/close", "POST"],
    ["GET", "/cases/1/reopen", "POST"],
    ["GET", "/cases/1/tags", "PUT"],
    ["GET", "/cases/1/assignee", "PUT"],
    ["GET", "/cases/1/extra_access", "PUT"],
    ["GET", "/cases/1/notes/2/tags", "PUT"],
    ["GET", "/cases/1/notes/2/extra_access", "PUT"],
    ["PUT", "/cases/tags", "GET"],
    ["POST", "/cases/types", "GET"],
  ])("answers %s %s with 405, allowing %s", async (method, path, allowed) => {
    const mock = await start()
    const response = await send(mock, method, path)

    expect(response.status).toBe(405)
    expect(response.headers.get("Allow")).toBe(allowed)
    expect(await response.text()).toBe('{"detail":"Method Not Allowed"}')
  })

  it("answers a path the service does not declare with 404", async () => {
    const mock = await start()

    for (const path of ["/cases/1", "/cases/1/nope/", "/cases/1/notes/2"]) {
      const response = await send(mock, "GET", path)
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('{"detail":"Not Found"}')
    }
  })

  it("redirects a trailing slash to the path without it, at the root of the origin as dev does", async () => {
    const mock = await start()
    const list = await send(mock, "GET", "/cases/")
    const notes = await send(mock, "POST", "/cases/1/notes//?a=b")

    expect(list.status).toBe(307)
    expect(list.headers.get("Location")).toBe("http://localhost:8000/cases")
    expect(notes.status).toBe(307)
    expect(notes.headers.get("Location")).toBe("http://localhost:8000/cases/1/notes?a=b")
  })
})
