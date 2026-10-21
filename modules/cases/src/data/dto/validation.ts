/**
 * The readers every converter in this folder shares. Everything else about validating a
 * payload is specific to the field being read and lives beside it.
 */

/**
 * An identifier as this module carries it: a string, because routes, caches, and links
 * hold it and nothing does arithmetic on it. The services send integers, and a string of
 * digits is accepted too, since the participants service is not consistent about member
 * numbers. Anything else is refused, because a write sends the number back as a number.
 * @param value The untyped value the identifier arrived in.
 * @returns The identifier, or undefined when it is not a usable one.
 */
export function toId(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value)
  }
  if (typeof value === "string" && /^\d+$/u.test(value)) {
    return value
  }
  return undefined
}

/**
 * A moment the service sent as an ISO 8601 timestamp.
 * @param value The untyped value the timestamp arrived in.
 * @returns The moment, or undefined when the value is not a readable timestamp.
 */
export function toDate(value: unknown): Date | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Whether an untyped value is an object whose keys can be read further.
 * @param value The untyped value to check.
 * @returns True when the value is a readable record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
