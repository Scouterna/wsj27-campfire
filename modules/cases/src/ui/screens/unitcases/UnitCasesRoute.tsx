import { PageTitle } from "@scouterna/wsj27-campfire-ui"
import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { casesSectionLabel } from "../../section-label"
import { UnitCasesScreen } from "./UnitCasesScreen"

import "./UnitCasesScreen.css"

/**
 * The screen with the router attached, handing the address's parameter to the screen as
 * an ordinary prop so a story can render it with no router underneath. An address that
 * names no unit by its number says so, rather than showing a unit that does not exist.
 * @returns The screen, for the unit the address names.
 */
export function UnitCasesRoute(): ReactElement {
  const { unitNumber } = useParams({ from: "/cases/unit/$unitNumber" })
  if (!/^[1-9]\d*$/u.test(unitNumber)) {
    return (
      <>
        <PageTitle title={casesSectionLabel} />
        <p className="unit-cases-status" role="status">
          Det finns ingen avdelning med det numret.
        </p>
      </>
    )
  }
  return <UnitCasesScreen unitNumber={Number(unitNumber)} />
}
