import type { Persona, PersonaGroup } from "../../src/types.ts"

import { units } from "../units.ts"
import { persona as admin } from "./admin.ts"
import { persona as cmt } from "./cmt.ts"
import { persona as communication } from "./communication.ts"
import { persona as healthGrant } from "./health-grant.ts"
import { persona as health } from "./health.ts"
import { persona as hoc } from "./hoc.ts"
import { persona as istSupport } from "./ist-support.ts"
import { persona as leader1 } from "./leader-1.ts"
import { persona as leader2 } from "./leader-2.ts"
import { persona as outsider } from "./outsider.ts"
import { persona as program } from "./program.ts"
import { persona as unitSupport } from "./unit-support.ts"

/**
 * Every persona, grouped the way the sign-in picker presents them: each unit's leader,
 * then the contingent management, then someone from outside it. One file per person, and
 * each is here for a case rather than for numbers – its description says which.
 */
export const groups: readonly PersonaGroup[] = [
  { label: labelFor(1), personas: [leader1] },
  { label: labelFor(2), personas: [leader2] },
  {
    label: "Kontingentledning",
    personas: [
      hoc,
      admin,
      communication,
      program,
      health,
      healthGrant,
      istSupport,
      unitSupport,
      cmt,
    ],
  },
  { label: "Utanför kontingenten", personas: [outsider] },
]

/**
 * Every persona, flat, keyed by email.
 */
export const personas: ReadonlyMap<string, Persona> = new Map(
  groups.flatMap((group) => group.personas.map((persona) => [persona.email, persona])),
)

function labelFor(unitNumber: number): string {
  return units.find((unit) => unit.number === unitNumber)?.name ?? `Avdelning ${String(unitNumber)}`
}
