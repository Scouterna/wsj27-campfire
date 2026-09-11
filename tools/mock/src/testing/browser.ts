import type { Hono } from "hono"

/**
 * The origin the whole local stack serves, and every address the mock builds.
 */
export const origin = "http://localhost:8000"

// The paths a redirect is followed on – the auth service and the stand-in. Anything else is where
// the application would take over.
const followedPaths = ["/api/auth", "/__mock__"]

interface StoredCookie {
  readonly expiresAt: number
  readonly path: string
  readonly value: string
}

/**
 * A browser, as far as the mock's tests need one: it keeps the cookies each response sets for as
 * long as their Max-Age allows, sends the ones in scope for a request's path, and follows the
 * redirects that stay on the mock's own paths.
 */
export class Browser {
  readonly #app: Hono
  readonly #cookies = new Map<string, StoredCookie>()
  readonly #now: () => number

  /**
   * @param app The mock to browse.
   * @param now The clock the cookies expire by – the same one the mock runs on.
   */
  constructor(app: Hono, now: () => number = Date.now) {
    this.#app = app
    this.#now = now
  }

  #store(header: string): void {
    const [pair = "", ...attributes] = header.split(";").map((part) => part.trim())
    const separator = pair.indexOf("=")
    const name = pair.slice(0, separator)
    let maxAge = Infinity
    let path = "/"
    for (const attribute of attributes) {
      const [key = "", value = ""] = attribute.split("=", 2)
      if (key.toLowerCase() === "max-age") {
        maxAge = Number(value)
      } else if (key.toLowerCase() === "path") {
        path = value
      }
    }
    if (maxAge <= 0) {
      this.#cookies.delete(name)
      return
    }
    this.#cookies.set(name, {
      expiresAt: this.#now() + maxAge * 1000,
      path,
      value: pair.slice(separator + 1),
    })
  }

  /**
   * A cookie's value while it lives.
   * @param name The cookie's name.
   * @returns The value, or undefined once it has expired or was never set.
   */
  cookie(name: string): string | undefined {
    const stored = this.#cookies.get(name)
    return stored !== undefined && stored.expiresAt > this.#now() ? stored.value : undefined
  }

  /**
   * Sends one request with the cookies in scope, and keeps what it sets.
   * @param url The absolute address.
   * @param init The method, the body, and any headers beyond the cookies.
   * @returns The response.
   */
  async fetch(url: string, init: RequestInit = {}): Promise<Response> {
    const { pathname } = new URL(url)
    const cookies: string[] = []
    for (const [name, stored] of this.#cookies) {
      if (this.cookie(name) !== undefined && pathname.startsWith(stored.path)) {
        cookies.push(`${name}=${stored.value}`)
      }
    }
    const headers = new Headers(init.headers)
    if (cookies.length > 0) {
      headers.set("Cookie", cookies.join("; "))
    }
    const response = await this.#app.request(url, { ...init, headers })
    for (const header of response.headers.getSetCookie()) {
      this.#store(header)
    }
    return response
  }

  /**
   * Navigates to an address and follows redirects while they stay on the mock's own paths.
   * @param url The absolute address.
   * @returns The last response, and the address it answered.
   */
  async navigate(url: string): Promise<{ readonly response: Response; readonly url: string }> {
    let current = url
    let response = await this.fetch(current)
    let next = followable(response, current)
    while (next !== undefined) {
      current = next
      response = await this.fetch(current)
      next = followable(response, current)
    }
    return { response, url: current }
  }
}

function followable(response: Response, current: string): string | undefined {
  const location = response.headers.get("Location")
  if (response.status !== 302 || location === null) {
    return undefined
  }
  const next = new URL(location, current)
  const isFollowed = followedPaths.some((path) => next.pathname.startsWith(path))
  return next.origin === origin && isFollowed ? next.href : undefined
}

/**
 * Signs a persona in the way a browser does: login, the stand-in's picker, the chosen name, and
 * the callback, stopping where the application would take over.
 * @param browser The browser to sign in with.
 * @param email The persona's email.
 * @param returnTo Where the application asks to come back to.
 * @returns The callback's redirect back to the application.
 */
export async function signIn(
  browser: Browser,
  email: string,
  returnTo = `${origin}/`,
): Promise<Response> {
  const login = new URLSearchParams({ redirect_uri: returnTo })
  const picker = await browser.navigate(`${origin}/api/auth/login?${login.toString()}`)
  const choice = new URL(picker.url).searchParams
  choice.set("email", email)
  const landed = await browser.navigate(`${origin}/__mock__/scoutid/choose?${choice.toString()}`)
  return landed.response
}
