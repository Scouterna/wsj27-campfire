/**
 * What someone is at the jamboree.
 *
 * A closed set, because the screens switch on it exhaustively, which is what makes an
 * unknown role a compile error rather than a blank label.
 */
export type ParticipantRole = "deltagare" | "ist" | "ledare" | "kontingentledning"

/**
 * The roles, in the order the list of participants presents them – leadership first,
 * because a unit's people are read to find who is responsible before who is attending.
 */
export const roleOrder: readonly ParticipantRole[] = [
  "kontingentledning",
  "ledare",
  "ist",
  "deltagare",
]

/**
 * What a role is called in the row that shows it, singular.
 * @param role The role to name.
 * @returns The Swedish word for it.
 */
export function roleName(role: ParticipantRole): string {
  switch (role) {
    case "kontingentledning": {
      return "CMT"
    }
    case "ledare": {
      return "Ledare"
    }
    case "ist": {
      return "IST"
    }
    case "deltagare": {
      return "Deltagare"
    }
  }
}
