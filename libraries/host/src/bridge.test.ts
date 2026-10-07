import { afterEach, describe, expect, it, vi, type Mock } from "vitest"

import type { ToWeb } from "./index"

type Listener = (event: { readonly data: unknown }) => void

/**
 * One evaluation of the package with a host in place: what the page posted, and a way
 * to deliver a message the way that host would.
 */
interface Loaded {
  readonly deliver: (json: unknown) => void
  readonly module: typeof import("./index")
  readonly posted: Mock
}

const agents = {
  android: "Mozilla/5.0 (Linux; Android 16) CampfireShell/1 (android)",
  browser: "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15",
  ios: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CampfireShell/1 (ios)",
} as const

/**
 * Evaluates the package fresh, because the host is computed once at module evaluation.
 * Both platforms' channels are left on the page whatever the agent says, so a case that
 * expects nothing posted proves the bridge left a reachable channel alone.
 *
 * @param agent Which host the User-Agent announces.
 * @returns The fresh module, its posts, and its delivery.
 */
async function load(agent: keyof typeof agents): Promise<Loaded> {
  const posted = vi.fn()
  let listener: Listener | undefined

  // eslint-disable-next-line security/detect-object-injection -- the key is the test's own literal union
  vi.stubGlobal("navigator", { userAgent: agents[agent] })
  vi.stubGlobal("webkit", { messageHandlers: { campfire: { postMessage: posted } } })
  vi.stubGlobal("campfire", {
    addEventListener: (_type: string, handler: Listener) => {
      listener = handler
    },
    postMessage: posted,
  })

  vi.resetModules()
  const module = await import("./index")

  const deliver = (json: unknown): void => {
    if (agent === "android") {
      listener?.({ data: json })
      return
    }
    ;(globalThis as { __campfire?: { receive: (json: unknown) => void } }).__campfire?.receive(json)
  }

  return { deliver, module, posted }
}

/**
 * Delivers one message and collects what reached a subscriber.
 *
 * @param loaded The evaluated package.
 * @param json What the shell sends.
 * @returns Every message the subscriber heard.
 */
function heard(loaded: Loaded, json: unknown): ToWeb[] {
  const messages: ToWeb[] = []
  const unsubscribe = loaded.module.onShellMessage((message) => {
    messages.push(message)
  })
  loaded.deliver(json)
  unsubscribe()
  return messages
}

afterEach(() => {
  vi.unstubAllGlobals()
  // The bridge sets this itself rather than through a stub, so unstubbing leaves it.
  delete (globalThis as { __campfire?: unknown }).__campfire
})

describe.each(["android", "ios"] as const)("in the %s shell", (platform) => {
  it("posts a message with the version added", async () => {
    const loaded = await load(platform)

    loaded.module.sendToShell({ name: "brown", type: "theme" })

    expect(loaded.posted).toHaveBeenCalledExactlyOnceWith('{"v":1,"name":"brown","type":"theme"}')
  })

  it.each<[string, unknown, ToWeb]>([
    ["a back", { type: "back", v: 1 }, { animated: true, type: "back", v: 1 }],
    [
      "a back the swipe animated",
      { animated: false, type: "back", v: 1 },
      { animated: false, type: "back", v: 1 },
    ],
    ["a forward", { type: "forward", v: 1 }, { type: "forward", v: 1 }],
    ["a pop to root", { type: "popToRoot", v: 1 }, { type: "popToRoot", v: 1 }],
    ["an action", { id: "primary", type: "action", v: 1 }, { id: "primary", type: "action", v: 1 }],
    [
      "an address to open",
      { path: "/profile", type: "open", v: 1 },
      { path: "/profile", type: "open", v: 1 },
    ],
  ])("hands on %s", async (_name, sent, expected) => {
    const loaded = await load(platform)

    expect(heard(loaded, JSON.stringify(sent))).toEqual([expected])
  })

  it.each([
    ["malformed JSON", "{not json"],
    ["something that is not a string", { type: "back", v: 1 }],
    ["another version", JSON.stringify({ type: "back", v: 2 })],
    ["no version", JSON.stringify({ type: "back" })],
    ["an unknown type", JSON.stringify({ type: "explode", v: 1 })],
    ["an action without an id", JSON.stringify({ type: "action", v: 1 })],
    [
      "an address on another origin",
      JSON.stringify({ path: "//evil.example", type: "open", v: 1 }),
    ],
    ["an absolute URL", JSON.stringify({ path: "https://evil.example", type: "open", v: 1 })],
    ["a JSON null", "null"],
  ])("drops %s", async (_name, json) => {
    const loaded = await load(platform)

    expect(heard(loaded, json)).toEqual([])
  })

  it("calls each subscription once, and stops calling one that unsubscribed", async () => {
    const loaded = await load(platform)
    const handler = vi.fn()
    const first = loaded.module.onShellMessage(handler)
    loaded.module.onShellMessage(handler)

    first()
    loaded.deliver(JSON.stringify({ type: "forward", v: 1 }))

    expect(handler).toHaveBeenCalledOnce()
  })
})

describe("in a browser", () => {
  it("posts nothing, though a channel is on the page", async () => {
    const loaded = await load("browser")

    loaded.module.sendToShell({ signedIn: false, type: "session" })

    expect(loaded.posted).not.toHaveBeenCalled()
  })

  it("installs no receiver on the page", async () => {
    await load("browser")

    expect((globalThis as { __campfire?: unknown }).__campfire).toBeUndefined()
  })
})
