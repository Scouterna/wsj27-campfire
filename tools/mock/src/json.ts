/**
 * Narrows an unknown value to a plain JSON object.
 * @param value The value to test.
 * @returns Whether the value is an object that is neither null nor an array.
 */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Reads one member of a JSON object by name – its own members only, so a name like `__proto__`
 * reads as absent, the way a Python dict reads it.
 * @param value The object, or anything else.
 * @param name The member's name.
 * @returns The member's value, or undefined when there is none or `value` is not an object.
 */
export function field(value: unknown, name: string): unknown {
  const descriptor = isRecord(value) ? Object.getOwnPropertyDescriptor(value, name) : undefined
  return descriptor?.value as unknown
}

/**
 * Orders two strings the way Python's `sorted()` does – by code unit, not by locale.
 * @param left One string.
 * @param right The other.
 * @returns Negative when `left` sorts first, positive when `right` does, zero when equal.
 */
export function byCodePoint(left: string, right: string): number {
  if (left < right) {
    return -1
  }
  return left > right ? 1 : 0
}

/**
 * Serializes a value the way Python's `json.dumps(value, ensure_ascii=False, sort_keys=True)`
 * does – keys sorted, and a space after every `,` and `:` – so a body hashed here hashes to the
 * digest the service computes over its own.
 * @param value A value made of objects, arrays, strings, numbers, booleans, and null.
 * @returns The serialized text.
 */
export function pythonJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item: unknown) => pythonJson(item)).join(", ")}]`
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .toSorted(([left], [right]) => byCodePoint(left, right))
      .map(([key, item]) => `${JSON.stringify(key)}: ${pythonJson(item)}`)
    return `{${entries.join(", ")}}`
  }
  return JSON.stringify(value)
}
