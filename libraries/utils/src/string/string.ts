/**
 * A string, or the fallback when the value is anything else.
 *
 * Written for reading untyped input – a JSON body, a query parameter, a build setting –
 * where "the key was missing" and "the key held a number" should reach the caller as the
 * same harmless answer rather than as two different crashes.
 * @param value The untyped value to read.
 * @param fallback What to answer when the value is not a string.
 * @returns The string as it is, or the fallback.
 */
export function stringOrFallback(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}
