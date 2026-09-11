import { readFileSync } from "node:fs"

/**
 * The CMT roster the project API reads a management member's Funktion and Roll from – the CSV
 * its `CMT_ROLES_FILE` points at, in the columns its own tooling writes.
 * @returns The file's text.
 */
export function readCmtRoles(): string {
  return readFileSync(new URL("cmt-roles.csv", import.meta.url), "utf8")
}

export { forms } from "./forms.ts"
export { participants } from "./participants.ts"
