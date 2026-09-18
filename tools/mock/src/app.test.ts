import { describe, expect, it } from "vitest"

import { createApp } from "./app.ts"
import { generateSigningKey } from "./keys.ts"
import { Browser, origin, signIn } from "./testing/browser.ts"
import { clock } from "./testing/clock.ts"

const key = generateSigningKey()

describe("the mock's own surface", () => {
  it("answers each service's health check at its bare prefix and with a trailing slash", async () => {
    const time = clock()
    const app = createApp({ key, now: time.now })

    for (const path of ["/api/project", "/api/project/"]) {
      const response = await app.request(`${origin}${path}`)
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('{"status":"ok","service":"wsj27-project-api"}')
      expect(response.headers.get("Cache-Control")).toBe(
        "no-store, no-cache, must-revalidate, max-age=0",
      )
    }
    for (const path of ["/api/auth", "/api/auth/"]) {
      const response = await app.request(`${origin}${path}`)
      // Twelve members hold roles: three leaders and nine in the contingent management.
      expect(await response.json()).toEqual({
        status: "ok",
        service: "wsj27-auth-api",
        roles: { members: 15, last_refresh: time.now() / 1000, stale: false },
      })
    }
  })

  it("answers an unknown path and a wrong method the way Starlette does", async () => {
    const app = createApp({ key })

    const unknown = await app.request(`${origin}/api/auth/nope`)
    expect(unknown.status).toBe(404)
    expect(await unknown.text()).toBe('{"detail":"Not Found"}')

    const posted = await app.request(`${origin}/api/auth/user`, { method: "POST" })
    expect(posted.status).toBe(405)
    expect(posted.headers.get("Allow")).toBe("GET")
    expect(await posted.text()).toBe('{"detail":"Method Not Allowed"}')

    const fetched = await app.request(`${origin}/api/auth/token`)
    expect(fetched.status).toBe(405)
    expect(fetched.headers.get("Allow")).toBe("POST")
  })

  it("reports the ScoutID stand-in's sessions, and resets them", async () => {
    const app = createApp({ key })
    await signIn(new Browser(app), "admin@wsj.se")

    const state = await app.request(`${origin}/__mock__/state`)
    expect(await state.json()).toEqual({
      sessions: [{ email: "admin@wsj.se", roles: ["wsj27:cmt:admin:fa"] }],
    })

    const reset = await app.request(`${origin}/__mock__/reset`, { method: "POST" })
    expect(await reset.json()).toEqual({ reset: true })
    const after = await app.request(`${origin}/__mock__/state`)
    expect(await after.json()).toEqual({ sessions: [] })
  })
})
