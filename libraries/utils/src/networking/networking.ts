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
 * What a request sends beside its address: the method, and the body to send as JSON.
 */
interface Outgoing {
  /**
   * The value to send, encoded as JSON.
   */
  readonly body?: unknown
  /**
   * The method, for a request that changes something.
   */
  readonly method: "POST" | "PUT"
}

/**
 * Asks a service for JSON, or sends it JSON and reads the answer – the request, the
 * status check, and the parse.
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
 * @param init What to send, left out for a plain GET. A body is sent as JSON.
 * @returns The body, parsed as JSON and typed as the caller asked.
 */
export async function fetch<T>(url: string, init?: Outgoing): Promise<T> {
  let response: Response
  try {
    // The global, because this function's own name shadows it.
    response = await (init === undefined
      ? globalThis.fetch(url)
      : globalThis.fetch(url, toRequestInit(init)))
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

/**
 * The platform's request options for what the caller asked to send.
 * @param init The method and the body the caller asked for.
 * @returns The options, with the body encoded and labeled as JSON when there is one.
 */
function toRequestInit(init: Outgoing): RequestInit {
  if (init.body === undefined) {
    return { method: init.method }
  }
  return {
    body: JSON.stringify(init.body),
    headers: { "content-type": "application/json" },
    method: init.method,
  }
}
