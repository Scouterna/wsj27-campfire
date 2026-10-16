import { isCaseType, type CaseType } from "../../model/CaseType"

/**
 * The types the cases service says the caller may open cases of, with any this module
 * does not know left out, since it could neither offer nor describe one.
 * @param value The body the service answered with.
 * @returns The types, in the order the service listed them.
 */
export function toCaseTypes(value: unknown): readonly CaseType[] {
  return Array.isArray(value) ? value.filter((type: unknown) => isCaseType(type)) : []
}
