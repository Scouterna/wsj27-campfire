import { afterEach, describe, expect, it, vi } from "vitest"

import { fetch, HttpError } from "./networking"

/**
 * Stands in for the platform's `fetch`, so a test can decide what the network did.
 */
function networkAnswers(answer: () => Promise<Response>): void {
  vi.stubGlobal("fetch", answer)
}

describe("asking a service for JSON", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the body, typed by the caller", async () => {
    networkAnswers(() => Promise.resolve(Response.json({ total: 3 })))

    const body = await fetch<{ total: number }>("/api/project/participants")

    expect(body.total).toBe(3)
  })

  it("names the address when the request never reached a server", async () => {
    // No network, a refused connection, or a DNS failure, which is not a server saying no.
    networkAnswers(() => Promise.reject(new TypeError("Load failed")))

    await expect(fetch("/api/project/participants")).rejects.toThrow(
      "Could not reach /api/project/participants",
    )
  })

  it("keeps the original failure as the cause", async () => {
    const original = new TypeError("Load failed")
    networkAnswers(() => Promise.reject(original))

    await expect(fetch("/api/project/participants")).rejects.toThrow(
      expect.objectContaining({ cause: original }),
    )
  })

  it("names the address and the status when the service refused", async () => {
    networkAnswers(() =>
      Promise.resolve(new Response("{}", { status: 503, statusText: "Service Unavailable" })),
    )

    await expect(fetch("/api/project/participants")).rejects.toThrow(
      "/api/project/participants answered 503 Service Unavailable",
    )
  })

  it("leaves out an empty status text rather than trailing a space", async () => {
    // HTTP/2 carries no reason phrase, so `statusText` is routinely empty.
    networkAnswers(() => Promise.resolve(new Response("{}", { status: 404 })))

    await expect(fetch("/api/project/participants")).rejects.toThrow(
      /\/api\/project\/participants answered 404$/u,
    )
  })

  it("throws an HttpError carrying the status when the service refused", async () => {
    // A caller branches on `instanceof HttpError` and on the status, so asserting the
    // fields alone would pass for a plain Error with them pasted on.
    networkAnswers(() => Promise.resolve(new Response("{}", { status: 403 })))

    await expect(fetch("/api/project/participants")).rejects.toBeInstanceOf(HttpError)
    await expect(fetch("/api/project/participants")).rejects.toHaveProperty("status", 403)
  })

  it("distinguishes a 403 refusal from a 404 refusal", async () => {
    networkAnswers(() => Promise.resolve(new Response("{}", { status: 403 })))
    await expect(fetch("/api/project/participants")).rejects.toHaveProperty("status", 403)

    networkAnswers(() => Promise.resolve(new Response("{}", { status: 404 })))
    await expect(fetch("/api/project/participants")).rejects.toHaveProperty("status", 404)
  })

  it("leaves a request that never arrived a plain Error", async () => {
    // No server produced it, so it is not a refusal, and the same branch must not take
    // it for one.
    networkAnswers(() => Promise.reject(new TypeError("Load failed")))

    await expect(fetch("/api/project/participants")).rejects.not.toBeInstanceOf(HttpError)
    await expect(fetch("/api/project/participants")).rejects.toBeInstanceOf(Error)
  })

  it("says so when the answer was not JSON at all", async () => {
    // A dev server with no API behind it answers with the application's own index.html.
    networkAnswers(() => Promise.resolve(new Response("<!doctype html><html></html>")))

    await expect(fetch("/api/project/participants")).rejects.toThrow("not JSON")
  })

  it("names the address when the answer was not JSON", async () => {
    networkAnswers(() => Promise.resolve(new Response("<!doctype html><html></html>")))

    await expect(fetch("/api/project/participants")).rejects.toThrow(
      "/api/project/participants answered with something that is not JSON",
    )
  })
})
