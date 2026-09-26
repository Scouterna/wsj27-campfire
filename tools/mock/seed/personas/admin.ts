import type { Persona } from "../../src/types.ts"

/**
 * Anna, in the administration function – the one persona allowed the role map.
 */
export const persona: Persona = {
  email: "admin@wsj.se",
  givenName: "Anna",
  familyName: "Almgren",
  memberNo: "1200201",
  description:
    "Administration. Ser alla utan hälsouppgifter, och är den enda som får läsa rollkartan.",
}
