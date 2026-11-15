/**
 * The reader every converter in this folder shares. Everything else about validating
 * a payload is specific to the field being read and lives beside it.
 */

/**
 * Whether an untyped value is an object whose keys can be read further. The keys are
 * destructured or bracket-read rather than dot-accessed, because every value behind one
 * is still `unknown`.
 * @param value The untyped value to check.
 * @returns True when the value is a readable record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
