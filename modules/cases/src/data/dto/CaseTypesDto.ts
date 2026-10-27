import { isCaseType } from "../../model/CaseType"

/**
 * The types the cases service says the caller may open cases of, a type this module does
 * not know included, with anything that names no type left out.
 * @param value The body the service answered with.
 * @returns The types, in the order the service listed them.
 */
export function toCaseTypes(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((type: unknown) => isCaseType(type)) : []
}
