import type { Context, Hono, MiddlewareHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

/**
 * What FastAPI and Starlette do on the wire, which both services inherit and the mock has to
 * repeat exactly: validation errors in pydantic's shape, plain-text refusals, the no-cache
 * headers, JSON 404s and 405s, and cookies written and read the way Python's `http.cookies`
 * writes and reads them.
 */

/**
 * One entry in the body FastAPI sends when validation refuses a request – pydantic's own error
 * shape.
 */
export interface ValidationError {
  /**
   * Extra detail some errors carry, such as the values a literal accepts.
   */
  readonly ctx?: Readonly<Record<string, string>>
  /**
   * What was sent, or null when nothing was.
   */
  readonly input: unknown
  /**
   * Where the value was looked for – `["query", "infolevel"]`.
   */
  readonly loc: readonly string[]
  /**
   * The sentence pydantic words the error in.
   */
  readonly msg: string
  /**
   * pydantic's code for the error.
   */
  readonly type: string
}

/**
 * A required parameter that was not sent – or, in a form, sent empty.
 * @param loc Where it was looked for.
 * @returns The error, its keys in the order pydantic writes them.
 */
export function missingError(loc: readonly string[]): ValidationError {
  // eslint-disable-next-line unicorn/no-null -- pydantic reports an absent input as null
  return { type: "missing", loc, msg: "Field required", input: null }
}

/**
 * A value outside the `Literal` a parameter is declared as.
 * @param loc Where the value was sent.
 * @param input The value that was sent.
 * @param expected The values the literal accepts, in declaration order.
 * @returns The error, its keys in the order pydantic writes them.
 */
export function literalError(
  loc: readonly string[],
  input: string,
  expected: readonly string[],
): ValidationError {
  const quoted = expected.map((value) => `'${value}'`)
  const listed = `${quoted.slice(0, -1).join(", ")} or ${quoted.at(-1) ?? ""}`
  return {
    type: "literal_error",
    loc,
    msg: `Input should be ${listed}`,
    input,
    ctx: { expected: listed },
  }
}

/**
 * A value declared as an integer that does not parse as one.
 * @param loc Where the value was sent.
 * @param input The value that was sent.
 * @returns The error, its keys in the order pydantic writes them.
 */
export function intParsingError(loc: readonly string[], input: string): ValidationError {
  return {
    type: "int_parsing",
    loc,
    msg: "Input should be a valid integer, unable to parse string as an integer",
    input,
  }
}

/**
 * Reads an integer out of a string the way pydantic's lax mode does: surrounding whitespace
 * and a sign are allowed, anything else is not.
 * @param value The string that was sent.
 * @returns The integer, or undefined when the string is not one.
 */
export function parseInteger(value: string): number | undefined {
  const trimmed = value.trim()
  return /^[+-]?\d+$/u.test(trimmed) ? Number(trimmed) : undefined
}

/**
 * FastAPI's answer to a request that failed validation.
 * @param context The request being answered.
 * @param errors Every error found, in the order FastAPI collects them.
 * @returns The 422 response.
 */
export function validationFailed(context: Context, errors: readonly ValidationError[]): Response {
  return context.json({ detail: errors }, 422)
}

/**
 * A `PlainTextResponse`, with Starlette's content type.
 * @param context The request being answered.
 * @param body The text.
 * @param status The status code.
 * @returns The response.
 */
export function plainText(context: Context, body: string, status: ContentfulStatusCode): Response {
  return context.body(body, status, { "Content-Type": "text/plain; charset=utf-8" })
}

/**
 * Starlette's answer to a path no route matches.
 * @param context The request being answered.
 * @returns The 404 response.
 */
export function notFound(context: Context): Response {
  return context.json({ detail: "Not Found" }, 404)
}

/**
 * Both services' middleware, which marks every response as never to be cached – their
 * responses carry session state.
 * @param context The request being answered.
 * @param next The rest of the chain.
 */
export const noCache: MiddlewareHandler = async (context, next) => {
  await next()
  context.res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
  context.res.headers.set("Pragma", "no-cache")
  context.res.headers.set("Expires", "0")
}

// Every method a browser or a client sends to a route declared for another.
const methods = ["DELETE", "GET", "PATCH", "POST", "PUT"] as const

/**
 * Answers a path's other methods the way Starlette does – 405, with the one it allows.
 * @param router The router the path is declared on.
 * @param path The path.
 * @param allowed The method the path is declared for.
 */
export function refuseOtherMethods(router: Hono, path: string, allowed: "GET" | "POST"): void {
  router.on(
    methods.filter((method) => method !== allowed),
    path,
    (context) => {
      context.header("Allow", allowed)
      return context.json({ detail: "Method Not Allowed" }, 405)
    },
  )
}

/**
 * The attributes a `Set-Cookie` header carries.
 */
export interface CookieAttributes {
  /**
   * When to write an `expires` date, in milliseconds – Starlette writes one only when deleting.
   */
  readonly expires?: number
  readonly httpOnly: boolean
  readonly maxAge: number
  readonly path: string
  readonly secure: boolean
}

// Python's http.cookies: a value made only of these characters goes out as it is; any other
// value is quoted, and inside the quotes these and a few more pass through untouched.
const legalValue = /^[\w!#$%&'*+\-.:^`|~]+$/u
const unescapedInQuotes = /^[\w !#$%&'()*+\-./:<=>?@[\]^`{|}~]$/u

/**
 * A `Set-Cookie` header as Starlette writes one: the value quoted the way Python quotes it,
 * and the attributes in the order Python sorts them.
 * @param name The cookie's name.
 * @param value The cookie's value.
 * @param attributes Its lifetime, path, and flags.
 * @returns The header's value.
 */
export function cookieHeader(name: string, value: string, attributes: CookieAttributes): string {
  const parts = [`${name}=${quoteCookieValue(value)}`]
  if (attributes.expires !== undefined) {
    parts.push(`expires=${new Date(attributes.expires).toUTCString()}`)
  }
  if (attributes.httpOnly) {
    parts.push("HttpOnly")
  }
  parts.push(`Max-Age=${String(attributes.maxAge)}`, `Path=${attributes.path}`, "SameSite=lax")
  if (attributes.secure) {
    parts.push("Secure")
  }
  return parts.join("; ")
}

/**
 * Reads one cookie from a request the way Starlette's cookie parser does: split on `;`, the
 * last of a repeated name wins, and a quoted value is unquoted.
 * @param context The request.
 * @param name The cookie's name.
 * @returns The cookie's value, or undefined when the request does not carry it.
 */
export function readCookie(context: Context, name: string): string | undefined {
  const cookies = new Map<string, string>()
  const chunks = (context.req.header("Cookie") ?? "").split(";")
  for (const chunk of chunks) {
    const separator = chunk.indexOf("=")
    const key = separator === -1 ? "" : chunk.slice(0, separator).trim()
    const value = (separator === -1 ? chunk : chunk.slice(separator + 1)).trim()
    if (key !== "" || value !== "") {
      cookies.set(key, unquoteCookieValue(value))
    }
  }
  return cookies.get(name)
}

function quoteCookieValue(value: string): string {
  if (legalValue.test(value)) {
    return value
  }
  let quoted = ""
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (character === '"' || character === "\\") {
      quoted += `\\${character}`
    } else if (code > 255 || unescapedInQuotes.test(character)) {
      quoted += character
    } else {
      quoted += `\\${code.toString(8).padStart(3, "0")}`
    }
  }
  return `"${quoted}"`
}

function unquoteCookieValue(value: string): string {
  if (value.length < 2 || !value.startsWith('"') || !value.endsWith('"')) {
    return value
  }
  return value
    .slice(1, -1)
    .replaceAll(/\\(?:([0-3][0-7]{2})|(.))/gu, (_match, octal?: string, escaped?: string) =>
      octal === undefined ? (escaped ?? "") : String.fromCodePoint(Number.parseInt(octal, 8)),
    )
}
