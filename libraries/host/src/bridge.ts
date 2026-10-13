import { host } from "./host"
import { bridgeVersion, type ToShell, type ToWeb } from "./messages"

/**
 * The transport. The message shapes are the same on both platforms and the carriage is
 * not, and this file is where that difference stops.
 */

/**
 * What a shell injects for the page to post to.
 */
interface Channel {
  postMessage(json: string): void
}

/**
 * Android's injected object carries the reply too: the shell answers through the proxy
 * it was handed, and the answer arrives as a message event on the same object.
 */
interface AndroidChannel extends Channel {
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void
}

/**
 * The globals a shell leaves on the page, declared here rather than ambiently so nothing
 * outside this package can reach for them.
 */
type ShellGlobals = typeof globalThis & {
  __campfire?: { readonly receive: (json: string) => void }
  readonly campfire?: AndroidChannel
  readonly webkit?: { readonly messageHandlers?: { readonly campfire?: Channel } }
}

const globals = globalThis as ShellGlobals

const handlers = new Set<(message: ToWeb) => void>()

/**
 * The channel to post to, looked up per message rather than once, because a shell
 * installs it before the document's scripts run and nothing here may wait for it.
 *
 * @returns The platform's channel, or undefined in a browser or a shell that left none.
 */
function channel(): Channel | undefined {
  if (host.tier !== "shell") {
    return undefined
  }
  const found =
    host.platform === "android" ? globals.campfire : globals.webkit?.messageHandlers?.campfire
  return typeof found?.postMessage === "function" ? found : undefined
}

/**
 * Tell the shell something. A no-op in a browser, so a caller never asks which tier it
 * is in.
 *
 * @param message The message, without its version, which is added here.
 */
export function sendToShell(message: DistributiveOmit<ToShell, "v">): void {
  channel()?.postMessage(JSON.stringify({ v: bridgeVersion, ...message }))
}

/**
 * Listen to what the shell says. Never called in a browser. A message that does not
 * parse, carries another version, or names an unknown type never reaches a handler.
 *
 * @param handler Called once per message the shell sends.
 * @returns A function removing this subscription and no other.
 */
export function onShellMessage(handler: (message: ToWeb) => void): () => void {
  // Wrapped, so the same function subscribed twice is two subscriptions and each
  // unsubscribe removes only its own.
  const subscription = (message: ToWeb): void => {
    handler(message)
  }
  handlers.add(subscription)
  return () => {
    handlers.delete(subscription)
  }
}

/**
 * An `Omit` that keeps a union a union, so each message keeps its own fields.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * Reads one message from the shell, or nothing when it is not one this side knows.
 *
 * @param json The message as the shell sent it.
 * @returns The message, or undefined to drop it.
 */
export function decode(json: unknown): ToWeb | undefined {
  if (typeof json !== "string") {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return undefined
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined
  }
  const message = parsed as Record<string, unknown>
  if (message["v"] !== bridgeVersion) {
    return undefined
  }

  const v = bridgeVersion
  switch (message["type"]) {
    case "action": {
      const id = message["id"]
      return typeof id === "string" ? { id, type: "action", v } : undefined
    }
    case "back": {
      return { animated: message["animated"] !== false, type: "back", v }
    }
    case "forward": {
      return { type: "forward", v }
    }
    case "open": {
      const path = message["path"]
      // Origin-relative only, so a native control can never send the page elsewhere.
      return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
        ? { path, type: "open", v }
        : undefined
    }
    case "popToRoot": {
      return { type: "popToRoot", v }
    }
    default: {
      return undefined
    }
  }
}

function receive(json: unknown): void {
  const message = decode(json)
  if (message === undefined) {
    return
  }
  for (const handler of handlers) {
    handler(message)
  }
}

// The inbound side is installed at module evaluation, so the shell has somewhere to
// deliver from the moment the document's scripts have run.
// eslint-disable-next-line unicorn/no-top-level-side-effects -- the receiver must exist before anything renders, and nothing renders before this module is imported
installReceiver()

function installReceiver(): void {
  if (host.tier !== "shell") {
    return
  }
  if (host.platform === "android") {
    globals.campfire?.addEventListener("message", (event) => {
      receive(event.data)
    })
    return
  }
  // WKWebView has no reverse channel, so the shell evaluates a call into the page, and
  // the page leaves it something to call.
  globals.__campfire = { receive }
}
