/**
 * JSON as the project API's Python reads and writes it: decoded by the `json` module, with its
 * error messages and positions, and written the way Starlette's `JSONResponse` writes it. A
 * body echoed back in a refusal has to survive the round trip exactly – key order, integers of
 * any size, and floats written as Python writes them.
 */

/**
 * A float as Python holds one, kept apart from an integer because pydantic treats the two
 * differently and an echo writes `1.0` back as `1.0`.
 */
export class PyFloat {
  readonly value: number

  /**
   * @param value The number.
   */
  constructor(value: number) {
    this.value = value
  }
}

/**
 * A JSON value as the `json` module decodes it: an integer exact at any size, a float apart,
 * null as undefined, and an object as an ordered map.
 */
export type PyValue =
  | bigint
  | boolean
  | PyFloat
  | readonly PyValue[]
  | ReadonlyMap<string, PyValue>
  | string
  | undefined

/**
 * The `json` module's refusal of a document, with its message and the index it points at.
 */
export class JsonDecodeError extends Error {
  readonly position: number

  /**
   * @param message The module's message.
   * @param position The index the module reports.
   */
  constructor(message: string, position: number) {
    super(message)
    this.position = position
  }
}

/**
 * A value Starlette cannot write – a NaN, an infinity, or a lone surrogate – which fails the
 * response with a 500.
 */
export class RenderError extends Error {}

const whitespace = new Set([" ", "\t", "\n", "\r"])
const escapes = new Map([
  ['"', '"'],
  ["/", "/"],
  ["\\", "\\"],
  ["b", "\b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
])
const literals: readonly (readonly [string, PyValue])[] = [
  ["null", undefined],
  ["true", true],
  ["false", false],
  ["NaN", new PyFloat(NaN)],
  ["Infinity", new PyFloat(Infinity)],
  ["-Infinity", new PyFloat(-Infinity)],
]

// CPython 3.14's decoder in strict mode, one method per production.
class Decoder {
  #at = 0
  readonly #text: string

  constructor(text: string) {
    this.#text = text
  }

  #array(): PyValue {
    const items: PyValue[] = []
    this.#at += 1
    this.#skip()
    if (this.#peek() === "]") {
      this.#at += 1
      return items
    }
    for (;;) {
      items.push(this.#value())
      if (this.#delimit("]", "array")) {
        return items
      }
    }
  }

  // After a member: true at the closing bracket, past the comma otherwise.
  #delimit(closing: string, kind: string): boolean {
    this.#skip()
    if (this.#peek() === closing) {
      this.#at += 1
      return true
    }
    if (this.#peek() !== ",") {
      throw new JsonDecodeError("Expecting ',' delimiter", this.#at)
    }
    const comma = this.#at
    this.#at += 1
    this.#skip()
    if (this.#peek() === closing) {
      throw new JsonDecodeError(`Illegal trailing comma before end of ${kind}`, comma)
    }
    return false
  }

  // One backslash escape at `at`, as the text it stands for and the characters it spans. Python
  // joins a surrogate pair itself; two UTF-16 halves in a row already are the character.
  #escape(at: number, begin: number): readonly [string, number] {
    const escape = this.#text.charAt(at + 1)
    if (escape === "") {
      throw new JsonDecodeError("Unterminated string starting at", begin)
    }
    if (escape === "u") {
      const hex = this.#text.slice(at + 2, at + 6)
      if (!/^[\da-f]{4}$/iu.test(hex)) {
        throw new JsonDecodeError(String.raw`Invalid \uXXXX escape`, at + 1)
      }
      return [String.fromCodePoint(Number.parseInt(hex, 16)), 6]
    }
    const unescaped = escapes.get(escape)
    if (unescaped === undefined) {
      throw new JsonDecodeError(String.raw`Invalid \escape`, at)
    }
    return [unescaped, 2]
  }

  #object(): PyValue {
    const fields = new Map<string, PyValue>()
    this.#at += 1
    this.#skip()
    if (this.#peek() === "}") {
      this.#at += 1
      return fields
    }
    for (;;) {
      if (this.#peek() !== '"') {
        throw new JsonDecodeError("Expecting property name enclosed in double quotes", this.#at)
      }
      const key = this.#string()
      this.#skip()
      if (this.#peek() !== ":") {
        throw new JsonDecodeError("Expecting ':' delimiter", this.#at)
      }
      this.#at += 1
      this.#skip()
      // A repeated key keeps its first place and takes its last value, as in a Python dict.
      fields.set(key, this.#value())
      if (this.#delimit("}", "object")) {
        return fields
      }
    }
  }

  #peek(): string {
    return this.#text.charAt(this.#at)
  }

  #skip(): void {
    while (whitespace.has(this.#peek())) {
      this.#at += 1
    }
  }

  #string(): string {
    const begin = this.#at
    let at = begin + 1
    let text = ""
    for (;;) {
      if (at >= this.#text.length) {
        throw new JsonDecodeError("Unterminated string starting at", begin)
      }
      const character = this.#text.charAt(at)
      if (character === '"') {
        this.#at = at + 1
        return text
      }
      if ((character.codePointAt(0) ?? 0) < 0x20) {
        throw new JsonDecodeError("Invalid control character at", at)
      }
      const [part, length] = character === "\\" ? this.#escape(at, begin) : [character, 1]
      text += part
      at += length
    }
  }

  // eslint-disable-next-line sonarjs/function-return-type -- a JSON value is any of its types
  #value(): PyValue {
    const opening = this.#peek()
    if (opening === '"') {
      return this.#string()
    }
    if (opening === "{") {
      return this.#object()
    }
    if (opening === "[") {
      return this.#array()
    }
    const literal = literals.find(([word]) => this.#text.startsWith(word, this.#at))
    if (literal !== undefined) {
      this.#at += literal[0].length
      return literal[1]
    }
    const number = /-?(?:0|[1-9]\d*)(\.\d+)?(e[+-]?\d+)?/iuy
    number.lastIndex = this.#at
    const match = number.exec(this.#text)
    if (match === null) {
      throw new JsonDecodeError("Expecting value", this.#at)
    }
    this.#at += match[0].length
    const isFloat = match[1] !== undefined || match[2] !== undefined
    return isFloat ? new PyFloat(Number(match[0])) : BigInt(match[0])
  }

  document(): PyValue {
    this.#skip()
    const value = this.#value()
    this.#skip()
    if (this.#at < this.#text.length) {
      throw new JsonDecodeError("Extra data", this.#at)
    }
    return value
  }
}

/**
 * Decodes a document as `json.loads` does – strictly, so a control character inside a string
 * is refused, and with NaN and the infinities allowed.
 * @param text The document.
 * @returns The value.
 * @throws {JsonDecodeError} When the document is not JSON, with the module's message and index.
 */
export function decodeJson(text: string): PyValue {
  return new Decoder(text).document()
}

// Python's repr of a float: the shortest digits that read back to the same value, in exponent
// form below 1e-4 and from 1e16.
function pythonFloat(value: number): string {
  if (!Number.isFinite(value)) {
    // Starlette renders with allow_nan off.
    throw new RenderError("out of range float")
  }
  if (Object.is(value, -0)) {
    return "-0.0"
  }
  const [mantissa = "", exponentText = ""] = value.toExponential().split("e", 2)
  const exponent = Number(exponentText)
  const sign = value < 0 ? "-" : ""
  const digits = mantissa.replace("-", "").replace(".", "")
  if (exponent < -4 || exponent >= 16) {
    const scaled = digits.length > 1 ? `${digits.slice(0, 1)}.${digits.slice(1)}` : digits
    const power = String(Math.abs(exponent)).padStart(2, "0")
    return `${sign}${scaled}e${exponent < 0 ? "-" : "+"}${power}`
  }
  if (exponent < 0) {
    return `${sign}0.${"0".repeat(-exponent - 1)}${digits}`
  }
  const whole = digits.slice(0, exponent + 1).padEnd(exponent + 1, "0")
  return `${sign}${whole}.${digits.slice(exponent + 1) || "0"}`
}

/**
 * Writes a value as Starlette's `JSONResponse` does: compact, with non-ASCII as it is. A
 * JavaScript number is an integer, a `PyFloat` is written as Python's repr, a map keeps its
 * order, and undefined is null.
 * @param value The value.
 * @returns The JSON text.
 * @throws {RenderError} When the value holds something Starlette cannot write.
 */
export function renderJson(value: unknown): string {
  if (value === undefined || value === null) {
    return "null"
  }
  if (typeof value === "bigint" || typeof value === "boolean" || typeof value === "number") {
    return String(value)
  }
  if (value instanceof PyFloat) {
    return pythonFloat(value.value)
  }
  if (typeof value === "string") {
    // Starlette encodes the body as UTF-8, which a lone surrogate cannot be.
    if (!value.isWellFormed()) {
      throw new RenderError("lone surrogate")
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item: unknown) => renderJson(item)).join(",")}]`
  }
  const entries = value instanceof Map ? [...value] : Object.entries(value)
  const members = entries.map(([key, item]) => `${renderJson(key)}:${renderJson(item)}`)
  return `{${members.join(",")}}`
}
