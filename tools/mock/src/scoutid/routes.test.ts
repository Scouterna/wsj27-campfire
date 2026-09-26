import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { createApp } from "../app.ts"
import { generateSigningKey } from "../keys.ts"
import { origin } from "../testing/browser.ts"

const key = generateSigningKey()
const faceUrl = new URL("../../static/bravelyscript.woff2", import.meta.url)

describe("the stand-in's static assets", () => {
  it("serves the display face the picker wears, byte for byte", async () => {
    const app = createApp({ key, now: () => 0 })

    const response = await app.request(`${origin}/__mock__/scoutid/bravelyscript.woff2`)
    const served = await response.arrayBuffer()

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("font/woff2")
    expect(new Uint8Array(served)).toStrictEqual(new Uint8Array(readFileSync(faceUrl)))
  })

  it("answers with a real woff2, not whatever happens to sit at that path", async () => {
    const app = createApp({ key, now: () => 0 })

    const response = await app.request(`${origin}/__mock__/scoutid/bravelyscript.woff2`)
    const served = await response.arrayBuffer()

    // The face is a copy kept in step with the design system's by hand, so the magic
    // number is worth asserting. A truncated or replaced copy fails here rather than as
    // a picker that silently loses its type.
    expect(new TextDecoder().decode(served.slice(0, 4))).toBe("wOF2")
  })
})
