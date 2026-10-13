import { describe, expect, it } from "vitest"

import { createApp } from "../app.ts"
import { generateSigningKey } from "../keys.ts"
import { origin } from "../testing/browser.ts"

const key = generateSigningKey()

describe("the CMS", () => {
  it("lists the whole handbook to anyone, signed in or not", async () => {
    const app = createApp({ key })
    const response = await app.request(`${origin}/_services/cms/api/info-page?depth=1&limit=1000`)

    expect(response.status).toBe(200)
    const body = (await response.json()) as { docs: { slug: string }[]; totalDocs: number }
    expect(body.totalDocs).toBe(body.docs.length)
    expect(body.docs.map((page) => page.slug)).toContain("vad-ar-handboken")
  })
})
