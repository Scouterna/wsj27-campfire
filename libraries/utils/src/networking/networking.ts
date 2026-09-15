/**
 * A refusal from a service: the request arrived and the answer was a no. Carries the
 * status so a caller can tell "you may not see this much" (403) from "there is no such
 * thing" (404) and act on the difference – retrying at a lower access level is the
 * concrete case. A network failure is deliberately not one of these; it stays a plain
 * `Error`, because no server produced it.
 */
export class HttpError extends Error {
  /**
   * The HTTP status code the service answered with.
   */
  readonly status: number

  /**
   * @param url The address that answered, named in the message for the reason every
   * other message here names it: it is the one label that cannot drift.
   * @param status The status code the service answered with.
   * @param statusText The reason phrase, which HTTP/2 does not carry – hence the trim,
   * so an empty one does not leave the message ending in a space.
   */
  constructor(url: string, status: number, statusText: string) {
    super(`${url} answered ${String(status)} ${statusText}`.trimEnd())
    this.name = "HttpError"
    this.status = status
  }
}

/**
 * Ask a service for JSON: the request, the status check, and the parse.
 *
 * The type parameter is the caller's description of what the endpoint sends, and it
 * carries through to the returned value – so a call site names the payload shape once
 * and everything downstream is typed from it.
 *
 * Named `fetch` on purpose, so a call reads like the platform call it replaces. Two
 * consequences worth knowing: importing this shadows the global `fetch` for the whole
 * file, and the implementation below has to say `globalThis.fetch` or it would call
 * itself.
 *
 * Every failure becomes an error naming the address that produced it, with the original
 * kept as `cause`. The address rather than a friendly label, because it is the one thing
 * that is always accurate – a hand-written name has to be maintained and drifts. These
 * messages are read in a console and a log; a screen carries its own Swedish for the
 * person.
 *
 * @param url Where to ask. Origin-relative, so the same call works against the mock, the
 * local back-end, and the deployed one.
 * @returns The body, parsed as JSON and typed as the caller asked.
 */
export async function fetch<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await globalThis.fetch(url)
  } catch (error) {
    // No network, a refused connection, a DNS failure – the request never reached a
    // server, which is a different thing from a server saying no. A caller in a field
    // with no signal has to be able to tell them apart: one means "try again later",
    // the other means "this is the answer".
    throw new Error(`Could not reach ${url}`, { cause: error })
  }

  if (!response.ok) {
    throw new HttpError(url, response.status, response.statusText)
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    // Not hypothetical: a dev server with no API behind it answers a request for
    // `/api/…` with the application's own `index.html`, and an error page in production
    // does the same.
    throw new Error(`${url} answered with something that is not JSON`, { cause: error })
  }
}
