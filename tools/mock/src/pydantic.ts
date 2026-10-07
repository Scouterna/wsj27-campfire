import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

import { plainText } from "./fastapi.ts"
import {
  decodeJson,
  JsonDecodeError,
  PyFloat,
  RenderError,
  renderJson,
  type PyValue,
} from "./python.ts"

/**
 * What FastAPI does with a request before a route runs – the body decoded, and every parameter
 * and field validated the way pydantic's lax mode validates it – and the answers it sends. A
 * refusal carries pydantic's type, location, message, and echoed input, so it matches the
 * service's byte for byte. `ValidationError` in `fastapi.ts` covers the text-only refusals of the
 * participant routes; these also echo decoded bodies and point into lists.
 */

/**
 * Where a value was found – `["body", "extra_access", 0]`.
 */
export type Loc = readonly (number | string)[]

/**
 * A decoded JSON object, as a body model reads it.
 */
export type Fields = ReadonlyMap<string, PyValue>

/**
 * One entry in the body FastAPI sends when validation refuses a request.
 */
export interface FieldError {
  readonly ctx?: Readonly<Record<string, number | string>>
  readonly input: PyValue
  readonly loc: Loc
  readonly msg: string
  readonly type: string
}

/**
 * Validates one value the way pydantic's lax mode does. A refusal is pushed onto `errors`, and
 * the value returned beside one is a placeholder nobody reads.
 */
export type Validator<T> = (input: PyValue, loc: Loc, errors: FieldError[]) => T

/**
 * Starlette's answer to an unhandled error.
 * @param context The request being answered.
 * @returns The 500 response.
 */
export function internalError(context: Context): Response {
  return plainText(context, "Internal Server Error", 500)
}

/**
 * A `JSONResponse`, written by `renderJson`. A value Starlette cannot write answers 500, as the
 * service's does.
 * @param context The request being answered.
 * @param body The value to send.
 * @param status The status code.
 * @returns The response.
 */
export function answer(
  context: Context,
  body: unknown,
  status: ContentfulStatusCode = 200,
): Response {
  try {
    return context.body(renderJson(body), status, {
      "Content-Type": "application/json",
    })
  } catch (error) {
    if (error instanceof RenderError) {
      return internalError(context)
    }
    throw error
  }
}

/**
 * An `HTTPException`'s answer.
 * @param context The request being answered.
 * @param text The exception's detail.
 * @param status The status code.
 * @returns The response.
 */
export function detail(context: Context, text: string, status: ContentfulStatusCode): Response {
  return answer(context, { detail: text }, status)
}

/**
 * FastAPI's answer to a request that failed validation.
 * @param context The request being answered.
 * @param errors Every error found, in the order FastAPI collects them – the path, the query,
 * then the body.
 * @returns The 422 response.
 */
export function invalid(context: Context, errors: readonly FieldError[]): Response {
  return answer(context, { detail: errors }, 422)
}

/**
 * Reads a body the way FastAPI does before any dependency runs, so a body that is not JSON is
 * refused even to a caller with no token. No body and JSON's null both read as undefined, which
 * a model reports as a missing body. A content type that is not JSON leaves the body as text,
 * which no model accepts.
 * @param context The request.
 * @returns The decoded body, or the refusal to answer with – 422 for JSON that does not
 * decode, and 400 for bytes that are not UTF-8.
 */
export async function readBody(context: Context): Promise<PyValue | Response> {
  const bytes = await context.req.arrayBuffer()
  if (bytes.byteLength === 0) {
    return undefined
  }
  const type = context.req.header("Content-Type")?.trim()
  const isJson = !type || /^application\/(?:[^\s;+]*\+)?json\s*(?:;|$)/iu.test(type)
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    // The JSON decoder fails on bytes that are not UTF-8, and so does an error body echoing them.
    return isJson
      ? detail(context, "There was an error parsing the body", 400)
      : internalError(context)
  }
  if (!isJson) {
    return text
  }
  try {
    return decodeJson(text)
  } catch (error) {
    if (!(error instanceof JsonDecodeError)) {
      throw error
    }
    const refusal = {
      type: "json_invalid",
      loc: ["body", error.position],
      msg: "JSON decode error",
      input: new Map(),
      ctx: { error: error.message },
    }
    return answer(context, { detail: [refusal] }, 422)
  }
}

function fieldError(
  type: string,
  loc: Loc,
  message: string,
  input: PyValue,
  extra?: Readonly<Record<string, number | string>>,
): FieldError {
  const refusal = { type, loc, msg: message, input }
  return extra === undefined ? refusal : { ...refusal, ctx: extra }
}

// Python's int() on text, as pydantic reads it: a sign, underscores between digits, surrounding
// whitespace, and a fraction of zeros.
function integerText(text: string): bigint | undefined {
  const digits = /^([+-]?\d+(?:_\d+)*)(?:\.0+)?$/u.exec(text.trim())?.[1]
  return digits === undefined ? undefined : BigInt(digits.replaceAll("_", ""))
}

/**
 * Validates an `int`: an integer, a boolean, a float with no fraction, or text holding one.
 * @param input The value sent.
 * @param loc Where it was sent.
 * @param errors Where a refusal goes.
 * @returns The integer.
 */
export function toInteger(input: PyValue, loc: Loc, errors: FieldError[]): bigint {
  if (typeof input === "bigint") {
    return input
  }
  if (typeof input === "boolean") {
    return input ? 1n : 0n
  }
  if (input instanceof PyFloat) {
    // A whole float an int64 cannot hold is refused before the database sees it, where a JSON
    // integer of the same size reaches the database and fails there.
    if (Number.isFinite(input.value) && Math.abs(input.value) >= 2 ** 63) {
      const message = "Unable to parse input string as an integer, exceeded maximum size"
      errors.push(fieldError("int_parsing_size", loc, message, input))
      return 0n
    }
    // Any whole float within that converts, not only a safe one, because Python's int() takes
    // them all.
    // eslint-disable-next-line unicorn/prefer-number-is-safe-integer
    if (Number.isInteger(input.value)) {
      return BigInt(input.value)
    }
    const [type, message] = Number.isFinite(input.value)
      ? ["int_from_float", "Input should be a valid integer, got a number with a fractional part"]
      : ["finite_number", "Input should be a finite number"]
    errors.push(fieldError(type, loc, message, input))
    return 0n
  }
  const parsed = typeof input === "string" ? integerText(input) : undefined
  if (parsed !== undefined) {
    return parsed
  }
  errors.push(
    typeof input === "string"
      ? fieldError(
          "int_parsing",
          loc,
          "Input should be a valid integer, unable to parse string as an integer",
          input,
        )
      : fieldError("int_type", loc, "Input should be a valid integer", input),
  )
  return 0n
}

/**
 * Validates an `int | None`.
 * @param input The value sent.
 * @param loc Where it was sent.
 * @param errors Where a refusal goes.
 * @returns The integer, or undefined for null.
 */
export function toNullableInteger(
  input: PyValue,
  loc: Loc,
  errors: FieldError[],
): bigint | undefined {
  return input === undefined ? undefined : toInteger(input, loc, errors)
}

/**
 * Validates a `str`, which lax mode does not make from anything else.
 * @param input The value sent.
 * @param loc Where it was sent.
 * @param errors Where a refusal goes.
 * @returns The text.
 */
export function toText(input: PyValue, loc: Loc, errors: FieldError[]): string {
  if (typeof input === "string") {
    return input
  }
  errors.push(fieldError("string_type", loc, "Input should be a valid string", input))
  return ""
}

/**
 * Makes the validator of a `list` of one type, each item refused at its own index.
 * @param item The validator for each item.
 * @returns The list's validator.
 */
export function listOf<T>(item: Validator<T>): Validator<readonly T[]> {
  return (input, loc, errors) => {
    if (Array.isArray(input)) {
      const items = input as readonly PyValue[]
      return items.map((value, index) => item(value, [...loc, index], errors))
    }
    errors.push(fieldError("list_type", loc, "Input should be a valid list", input))
    return []
  }
}

/**
 * Makes the validator of an `int` declared with `Field(ge=…, le=…)`. The bounds are checked
 * only once the value is an integer, and a refusal echoes what was sent rather than what it
 * became.
 * @param minimum The smallest value allowed.
 * @param maximum The largest value allowed.
 * @returns The bounded validator.
 */
export function boundedInteger(minimum: number, maximum: number): Validator<bigint> {
  return (input, loc, errors) => {
    const before = errors.length
    const value = toInteger(input, loc, errors)
    if (errors.length > before) {
      return value
    }
    if (value < BigInt(minimum)) {
      const message = `Input should be greater than or equal to ${String(minimum)}`
      errors.push(fieldError("greater_than_equal", loc, message, input, { ge: minimum }))
    } else if (value > BigInt(maximum)) {
      const message = `Input should be less than or equal to ${String(maximum)}`
      errors.push(fieldError("less_than_equal", loc, message, input, { le: maximum }))
    }
    return value
  }
}

const truths = new Set(["1", "on", "t", "true", "y", "yes"])
const falsehoods = new Set(["0", "f", "false", "n", "no", "off"])

/**
 * Validates a `bool` sent as text, in any case but with no surrounding whitespace.
 * @param input The value sent.
 * @param loc Where it was sent.
 * @param errors Where a refusal goes.
 * @returns Whether the text says yes.
 */
export function isTrue(input: PyValue, loc: Loc, errors: FieldError[]): boolean {
  const text = typeof input === "string" ? input.toLowerCase() : ""
  if (!truths.has(text) && !falsehoods.has(text)) {
    const message = "Input should be a valid boolean, unable to interpret input"
    errors.push(fieldError("bool_parsing", loc, message, input))
  }
  return truths.has(text)
}

// Why the first ten characters are not a date, in speedate's words, or undefined when they are.
function dateRefusal(text: string): string | undefined {
  const checks: readonly (readonly [RegExp, string])[] = [
    [/^.{10}/su, "input is too short"],
    [/^\d{4}/u, "invalid character in year"],
    [/^.{4}-/su, "invalid date separator, expected `-`"],
    [/^.{5}\d{2}/su, "invalid character in month"],
    [/^.{7}-/su, "invalid date separator, expected `-`"],
    [/^.{8}\d{2}/su, "invalid character in day"],
  ]
  const failed = checks.find(([pattern]) => !pattern.test(text))
  if (failed !== undefined) {
    return failed[1]
  }
  const month = Number(text.slice(5, 7))
  if (month < 1 || month > 12) {
    return "month value is outside expected range of 1-12"
  }
  const year = Number(text.slice(0, 4))
  const day = Number(text.slice(8, 10))
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].at(month - 1) ?? 0
  return day < 1 || day > days ? "day value is outside expected range" : undefined
}

// The time after a date, in microseconds since that midnight in UTC, or undefined when there is
// something after the date that is not a time: a separator, hours and minutes, optional seconds
// with an optional fraction, and an optional offset.
function timeOf(rest: string): number | undefined {
  if (rest === "") {
    return 0
  }
  const clock = /^[ _t](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/iu.exec(rest)
  const zone = /^(?:z|([+-])(\d{2}):?(\d{2}))?$/iu.exec(rest.slice(clock?.[0].length ?? 0))
  if (clock === null || zone === null) {
    return undefined
  }
  const hours = Number(clock[1])
  const minutes = Number(clock[2])
  const seconds = Number(clock[3] ?? 0)
  const offsetHours = Number(zone[2] ?? 0)
  const offsetMinutes = Number(zone[3] ?? 0)
  if (hours > 23 || minutes > 59 || seconds > 59 || offsetHours > 23 || offsetMinutes > 59) {
    return undefined
  }
  const offset = (zone[1] === "-" ? -1 : 1) * (offsetHours * 60 + offsetMinutes)
  const fraction = Number((clock[4] ?? "").slice(0, 6).padEnd(6, "0"))
  return ((hours * 60 + minutes - offset) * 60 + seconds) * 1_000_000 + fraction
}

/**
 * Validates a `datetime` sent as text: a Unix timestamp in seconds, or in milliseconds past
 * 2e10; a date alone; or a date and a time with an optional offset. A naive one is taken as
 * UTC, as the service's database takes it. A refusal gives the reason the date reading gives,
 * because pydantic falls back to it when the datetime reading fails.
 * @param input The value sent.
 * @param loc Where it was sent.
 * @param errors Where a refusal goes.
 * @returns Microseconds since the epoch.
 */
export function toDatetime(input: PyValue, loc: Loc, errors: FieldError[]): number {
  const text = typeof input === "string" ? input : ""
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(text)) {
    const value = Number(text)
    return Math.round(value * (Math.abs(value) > 2e10 ? 1000 : 1_000_000))
  }
  const time = timeOf(text.slice(10))
  const refusal =
    dateRefusal(text) ??
    (time === undefined ? "unexpected extra characters at the end of the input" : undefined)
  if (refusal !== undefined || time === undefined) {
    const message = `Input should be a valid datetime or date, ${refusal ?? ""}`
    errors.push(
      fieldError("datetime_from_date_parsing", loc, message, input, {
        error: refusal ?? "",
      }),
    )
    return 0
  }
  if (text.startsWith("0000")) {
    const error = "year 0 is out of range"
    const message = `Input should be a valid datetime, ${error}`
    errors.push(fieldError("datetime_parsing", loc, message, input, { error }))
    return 0
  }
  const midnight = new Date(0)
  const [year, month, day] = [text.slice(0, 4), text.slice(5, 7), text.slice(8, 10)].map(Number)
  midnight.setUTCFullYear(year ?? 0, (month ?? 1) - 1, day ?? 1)
  return midnight.getTime() * 1000 + time
}

/**
 * Reads a body model's fields.
 * @param body The decoded body.
 * @param errors Where a refusal goes – a missing body, or one that is not an object.
 * @returns The fields, or undefined when the body is refused.
 */
export function modelOf(body: PyValue, errors: FieldError[]): Fields | undefined {
  if (body instanceof Map) {
    return body
  }
  if (body === undefined) {
    errors.push(fieldError("missing", ["body"], "Field required", undefined))
  } else {
    const message = "Input should be a valid dictionary or object to extract fields from"
    errors.push(fieldError("model_attributes_type", ["body"], message, body))
  }
  return undefined
}

/**
 * Reads one field of a body model. A missing required field is refused with the whole body as
 * its input, as pydantic reports it.
 * @param fields The body's fields.
 * @param name The field's name.
 * @param errors Where a refusal goes.
 * @param validate The field's type.
 * @param isRequired Whether the field has no default.
 * @returns The value, or undefined when the field is missing – for its default, or beside a
 * refusal.
 */
export function bodyField<T>(
  fields: Fields,
  name: string,
  errors: FieldError[],
  validate: Validator<T>,
  isRequired: boolean,
): T | undefined {
  if (fields.has(name)) {
    return validate(fields.get(name), ["body", name], errors)
  }
  if (isRequired) {
    errors.push(fieldError("missing", ["body", name], "Field required", fields))
  }
  return undefined
}

/**
 * Reads one query parameter. Starlette keeps the last of a repeated one.
 * @param context The request.
 * @param name The parameter's name.
 * @param errors Where a refusal goes.
 * @param validate The parameter's type.
 * @returns The value, or undefined when it was not sent.
 */
export function queryField<T>(
  context: Context,
  name: string,
  errors: FieldError[],
  validate: Validator<T>,
): T | undefined {
  const sent = context.req.queries(name)?.at(-1)
  return sent === undefined ? undefined : validate(sent, ["query", name], errors)
}

/**
 * Reads one integer path parameter.
 * @param context The request.
 * @param route The parameter's name in the Hono route.
 * @param name The parameter's name in the service, which a refusal reports.
 * @param errors Where a refusal goes.
 * @returns The integer, or a placeholder beside a refusal.
 */
export function pathInteger(
  context: Context,
  route: string,
  name: string,
  errors: FieldError[],
): bigint {
  return toInteger(context.req.param(route) ?? "", ["path", name], errors)
}
