import { describe, expect, it } from "vitest"

import { createApp } from "../app.ts"
import { generateSigningKey } from "../keys.ts"
import { origin } from "../testing/browser.ts"

const key = generateSigningKey()

describe("the CMS", () => {
  it("lists the whole handbook to anyone, signed in or not", async () => {
    const app = createApp({ key })
    const response = await app.request(`${origin}/services/cms/api/info-page?depth=1&limit=1000`)

    expect(response.status).toBe(200)
    const body = (await response.json()) as { docs: { slug: string }[]; totalDocs: number }
    expect(body.totalDocs).toBe(body.docs.length)
    expect(body.docs.map((page) => page.slug)).toContain("vad-ar-handboken")
  })

  it("dates the handbook's change notes from now, a note for each stretch of age", async () => {
    const now = Date.parse("2027-01-10T18:00:00.000Z")
    const app = createApp({ key, now: () => now })
    const response = await app.request(`${origin}/services/cms/api/info-page`)

    const body = (await response.json()) as { docs: { changeNoteAt: string }[] }
    const days = body.docs
      .map((page) => (now - Date.parse(page.changeNoteAt)) / (24 * 60 * 60 * 1000))
      .toSorted((a, b) => a - b)
    expect(days).toEqual([0.25, 10.25, 20.25, 45.25])
  })

  it("serves an uploaded image the handbook names, and nothing it does not", async () => {
    const app = createApp({ key })
    const image = await app.request(`${origin}/services/cms/api/media/file/image4-756x373.webp`)
    const missing = await app.request(`${origin}/services/cms/api/media/file/saknas.webp`)

    expect(image.status).toBe(200)
    expect(image.headers.get("Content-Type")).toBe("image/webp")
    const bytes = await image.arrayBuffer()
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(missing.status).toBe(404)
  })
})
