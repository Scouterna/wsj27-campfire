/**
 * A refusal from a service – the request arrived and the answer was no. It carries the
 * status, so a caller can tell "you may not see this much" (403) from "there is no such
 * thing" (404) and retry at a lower access level on the first. A network failure stays a
 * plain `Error`, because no server produced it.
 */
export class HttpError extends Error {
  /**
   * The HTTP status code the service answered with.
   */
  readonly status: number

  /**
   * @param url The address that answered, which the message names.
   * @param status The status code the service answered with.
   * @param statusText The reason phrase, empty over HTTP/2, so the message is trimmed
   * rather than left ending in a space.
   */
  constructor(url: string, status: number, statusText: string) {
    super(`${url} answered ${String(status)} ${statusText}`.trimEnd())
    this.name = "HttpError"
    this.status = status
  }
}

/**
 * Asks a service for JSON – the request, the status check, and the parse.
 *
 * The type parameter is cast onto the parsed body, not checked, so the caller still
 * validates what arrived.
 *
 * Named `fetch` so a call reads like the platform call it replaces, which means
 * importing it shadows the global `fetch` for the whole file.
 *
 * A refusal is an `HttpError`. A request that reached nothing and an answer that was not
 * JSON are plain `Error`s. Every one names the address rather than a hand-written label,
 * because the address cannot drift, and keeps the original as `cause`. The messages are
 * for a console or a log; a screen words its own for the person.
 *
 * @param url Where to ask. Origin-relative, so the same call works against the mock, the
 * local back-end, and the deployed one.
 * @returns The body, parsed as JSON and typed as the caller asked.
 */
export async function fetch<T>(url: string): Promise<T> {
  let response: Response
  try {
    // The global, because this function's own name shadows it.
    response = await globalThis.fetch(url)
  } catch (error) {
    // No network, a refused connection, or a DNS failure never reached a server, and a
    // caller in a field with no signal must tell that apart from a refusal – one means
    // try again later, the other is the answer.
    throw new Error(`Could not reach ${url}`, { cause: error })
  }

  if (!response.ok) {
    throw new HttpError(url, response.status, response.statusText)
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    // A dev server with no API behind it answers a request for `/api/…` with the
    // application's own `index.html`, and an error page in production does the same.
    throw new Error(`${url} answered with something that is not JSON`, { cause: error })
  }
}
