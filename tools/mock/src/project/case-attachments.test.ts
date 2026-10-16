import sharp, { type Metadata } from "sharp"
import { describe, expect, it } from "vitest"

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

interface WireAttachment {
  readonly height: number
  readonly id: number
  readonly size: number
  readonly width: number
}

interface WireNote {
  readonly attachments: WireAttachment[]
  readonly id: number
}

/**
 * Where a picture goes on a note, or where one picture on it is read.
 * @param caseId The case.
 * @param noteId The note.
 * @param rest The picture's id and any query, after a slash.
 * @returns The path under the project API.
 */
function path(caseId: number, noteId: number, rest = ""): string {
  return `/cases/${String(caseId)}/notes/${String(noteId)}/attachments${rest}`
}

// A seeded case the health persona wrote, open, with notes of theirs on it, and the closed one.
const own = path(2, 5)
const otherNote = path(2, 4)
const closedOwn = path(1, 1)

// Every test starts its own mock, so the pictures it attaches are its own.
async function start(): Promise<Mock> {
  const time = clock()
  const app = createApp({ key, now: time.now })
  const browser = new Browser(app, time.now)
  await signIn(browser, "health@wsj.se")
  return { app, time, token: browser.cookie("wsj27-auth_access-token") ?? "" }
}

// Another member of the health team, who reads the persona's notes but wrote none of them.
function colleague(mock: Mock): string {
  return mintAccessToken({}, ["wsj27:cmt:support:halsa"], "9", key, mock.time.now()).token
}

async function picture(width: number, height: number): Promise<Blob> {
  const png = await sharp({ create: { background: "#ce4a17", channels: 3, height, width } })
    .png()
    .toBuffer()
  return new Blob([new Uint8Array(png)], { type: "image/png" })
}

// Posts a multipart form with `file` set to what is given, as the persona unless told otherwise.
async function upload(
  mock: Mock,
  target: string,
  file: Blob | string | undefined,
  token = mock.token,
): Promise<Response> {
  const form = new FormData()
  if (typeof file === "string") {
    form.set("file", file)
  } else if (file !== undefined) {
    form.set("file", file, "utslag.png")
  }
  return mock.app.request(`${origin}/api/project${target}`, {
    body: form,
    headers: { Cookie: `wsj27-auth_access-token=${token}` },
    method: "POST",
  })
}

async function send(
  mock: Mock,
  method: string,
  target: string,
  token = mock.token,
): Promise<Response> {
  return mock.app.request(`${origin}/api/project${target}`, {
    headers: { Cookie: `wsj27-auth_access-token=${token}` },
    method,
  })
}

async function said(sending: Promise<Response>): Promise<string> {
  const response = await sending
  return response.text()
}

async function stored(sending: Promise<Response>): Promise<WireAttachment> {
  const response = await sending
  expect(response.status).toBe(201)
  const body: unknown = await response.json()
  return body as WireAttachment
}

async function sizeOf(sending: Promise<Response>): Promise<Metadata> {
  const response = await sending
  const bytes = await response.arrayBuffer()
  return sharp(new Uint8Array(bytes)).metadata()
}

describe("attaching a picture", () => {
  it("answers 201 with the stored picture, a JPEG dated by the clock", async () => {
    const mock = await start()
    mock.time.advance(250)
    const response = await upload(mock, own, await picture(40, 30))
    const text = await response.clone().text()
    const { size } = await stored(Promise.resolve(response))

    expect(text).toBe(
      `{"id":1,"created_at":"2027-07-30T08:00:00.250000Z","creator_id":1200001,"filename":"utslag.png","content_type":"image/jpeg","width":40,"height":30,"size":${String(size)}}`,
    )
  })

  it("lists a note's pictures oldest first, and every other note with none", async () => {
    const mock = await start()
    await upload(mock, own, await picture(40, 30))
    await upload(mock, own, await picture(20, 20))
    const listed = await send(mock, "GET", "/cases/2/notes")
    const notes = (await listed.json()) as WireNote[]

    expect(notes.map((note) => [note.id, note.attachments.map(({ id }) => id)])).toEqual([
      [5, [1, 2]],
      [4, []],
      [3, []],
    ])
  })

  it("shrinks a picture to 2048 pixels and its thumbnail to 320, never growing one", async () => {
    const mock = await start()
    const large = await stored(upload(mock, own, await picture(3000, 1000)))
    const small = await stored(upload(mock, own, await picture(40, 30)))
    const tall = await stored(upload(mock, own, await picture(1000, 3000)))
    const largeThumbnail = await sizeOf(send(mock, "GET", `${own}/1?thumbnail=true`))
    const smallThumbnail = await sizeOf(send(mock, "GET", `${own}/2?thumbnail=1`))

    expect([large.width, large.height]).toEqual([2048, 683])
    expect([tall.width, tall.height]).toEqual([683, 2048])
    expect([largeThumbnail.width, largeThumbnail.height]).toEqual([320, 107])
    expect([small.width, small.height]).toEqual([40, 30])
    expect([smallThumbnail.width, smallThumbnail.height]).toEqual([40, 30])
  })

  it("turns a picture upright by its EXIF before it drops it", async () => {
    const mock = await start()
    const sideways = await sharp({
      create: { background: "#ce4a17", channels: 3, height: 30, width: 40 },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const blob = new Blob([new Uint8Array(sideways)], { type: "image/jpeg" })
    const attachment = await stored(upload(mock, own, blob))
    const served = await sizeOf(send(mock, "GET", `${own}/1`))

    expect([attachment.width, attachment.height]).toEqual([30, 40])
    expect(served.orientation).toBeUndefined()
  })

  it("refuses anyone but the note's author, and anyone who may not read it", async () => {
    const mock = await start()
    const file = await picture(40, 30)
    const outsider = mintAccessToken({}, ["wsj27:cmt"], "8", key, mock.time.now()).token
    const reader = colleague(mock)
    const notOwn = path(2, 1)

    expect(await said(upload(mock, own, file, reader))).toBe(
      `{"detail":"Only the note's author may attach to it"}`,
    )
    expect(await said(upload(mock, own, file, outsider))).toBe('{"detail":"Case not found"}')
    expect(await said(upload(mock, notOwn, file))).toBe('{"detail":"Note not found"}')
  })

  it("refuses a closed case, an eleventh picture, and what is no picture", async () => {
    const mock = await start()
    const file = await picture(4, 4)
    for (let count = 0; count < 10; count += 1) {
      await stored(upload(mock, own, file))
    }
    const text = new Blob(["inte en bild"], { type: "image/png" })

    expect(await said(upload(mock, closedOwn, file))).toBe('{"detail":"Case is closed"}')
    expect(await said(upload(mock, own, file))).toBe(
      '{"detail":"A note can have at most 10 pictures"}',
    )
    expect(await said(upload(mock, otherNote, text))).toBe(
      '{"detail":"Only JPEG, PNG and WebP pictures can be attached"}',
    )
  })

  it("refuses more than 20 MB before counting the note's pictures", async () => {
    const mock = await start()
    const response = await upload(mock, own, new Blob([new Uint8Array(20 * 1024 * 1024 + 1)]))

    expect(response.status).toBe(413)
    expect(await response.text()).toBe('{"detail":"Larger than 20 MB"}')
  })

  it("refuses a form without a file, or with text where the file goes, beside a bad path", async () => {
    const mock = await start()
    const missing = await upload(mock, own, undefined)
    const plain = await upload(mock, "/cases/2/notes/x/attachments", "bild")

    expect(missing.status).toBe(422)
    expect(await missing.text()).toBe(
      '{"detail":[{"type":"missing","loc":["body","file"],"msg":"Field required","input":null}]}',
    )
    expect(await plain.text()).toBe(
      `{"detail":[{"type":"int_parsing","loc":["path","note_id"],"msg":"Input should be a valid integer, unable to parse string as an integer","input":"x"},{"type":"value_error","loc":["body","file"],"msg":"Value error, Expected UploadFile, received: <class 'str'>","input":"bild","ctx":{"error":{}}}]}`,
    )
  })

  it("reads a request that is no form as one without a file, and refuses a broken one", async () => {
    const mock = await start()
    const headers = { Cookie: `wsj27-auth_access-token=${mock.token}` }
    const target = `${origin}/api/project${own}`
    const json = await mock.app.request(target, { body: "{}", headers, method: "POST" })
    const broken = await mock.app.request(target, {
      body: "--x\r\nnot a part",
      headers: { ...headers, "Content-Type": "multipart/form-data; boundary=x" },
      method: "POST",
    })

    expect(json.status).toBe(422)
    expect(broken.status).toBe(400)
    expect(await broken.text()).toBe('{"detail":"There was an error parsing the body"}')
  })
})

describe("reading a picture", () => {
  it("serves the JPEG to whoever reads the note, on a closed case too, never to be cached", async () => {
    const mock = await start()
    await upload(mock, own, await picture(40, 30))
    await send(mock, "POST", "/cases/2/close")
    const response = await send(mock, "GET", `${own}/1`, colleague(mock))
    const bytes = new Uint8Array(await response.arrayBuffer())

    expect(response.headers.get("Content-Type")).toBe("image/jpeg")
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, max-age=0",
    )
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8])
  })

  it("answers 404 for a picture on another note, and for a note the caller may not read", async () => {
    const mock = await start()
    await upload(mock, own, await picture(40, 30))
    const secret = await mock.app.request(`${origin}/api/project/cases/2/notes`, {
      body: '{"note": "n", "secrecy_level": 5, "title": "t"}',
      headers: {
        "Content-Type": "application/json",
        Cookie: `wsj27-auth_access-token=${mock.token}`,
      },
      method: "POST",
    })
    const { id } = (await secret.json()) as { id: number }
    const secretNote = path(2, id)
    await upload(mock, secretNote, await picture(4, 4))

    expect(await said(send(mock, "GET", `${otherNote}/1`))).toBe(
      '{"detail":"Attachment not found"}',
    )
    const reader = colleague(mock)

    expect(await said(send(mock, "GET", `${secretNote}/2`, reader))).toBe(
      '{"detail":"Note not found"}',
    )
  })

  it("refuses a thumbnail flag that is not a boolean", async () => {
    const mock = await start()

    expect(await said(send(mock, "GET", `${own}/1?thumbnail=maybe`))).toBe(
      '{"detail":[{"type":"bool_parsing","loc":["query","thumbnail"],"msg":"Input should be a valid boolean, unable to interpret input","input":"maybe"}]}',
    )
  })
})
