import type { Persona } from "../../src/types.ts"

/**
 * Olle, signed in with ScoutID but not part of the contingent – no project roles at all.
 */
export const persona: Persona = {
  email: "outsider@wsj.se",
  givenName: "Olle",
  familyName: "Ohlsson",
  memberNo: "1400001",
  description: "Inloggad men inte med i kontingenten. Nekas listan med deltagare helt.",
}
