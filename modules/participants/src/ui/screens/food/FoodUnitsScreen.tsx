import { Button, Card, PageTitle, Row, UnitAvatar } from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement } from "react"

import { unitNumberOf } from "../../../model/groups"
import { counted, personCount } from "../../counted"
import { useGroupEntries } from "../groups/use-groups"

import "./FoodScreen.css"

/**
 * The health team's way into a unit's diets and food allergies: every numbered unit, each
 * a doorway into its overview. Derived from the list of participants rather than asked
 * for separately, so the units cost no request once the list is cached.
 * @returns The screen.
 */
export function FoodUnitsScreen(): ReactElement {
  const { entries, error, isPending, refetch } = useGroupEntries()
  // The IST and the management are no unit, and have no overview.
  const units = useMemo(
    () =>
      entries.flatMap((entry) => {
        const unitNumber = unitNumberOf(entry.key)
        return unitNumber === undefined ? [] : [{ ...entry, unitNumber }]
      }),
    [entries],
  )

  return (
    <>
      <PageTitle title="Kost och allergier" />
      {isPending && (
        <p className="food-status" role="status">
          Hämtar avdelningarna …
        </p>
      )}
      {!isPending && error !== null && (
        <>
          <p className="food-status" role="status">
            Avdelningarna kunde inte hämtas.
          </p>
          <Button label="Försök igen" onPress={refetch} />
        </>
      )}
      {!isPending && error === null && units.length === 0 && (
        <p className="food-status" role="status">
          Ingen avdelning att visa.
        </p>
      )}
      {!isPending && error === null && units.length > 0 && (
        <Card aside={counted(units.length)} title="Avdelningar">
          {units.map((unit) => {
            const name = unit.name
            const people = personCount(unit.count)
            return (
              <Row
                key={unit.key}
                leading={<UnitAvatar unitNumber={unit.unitNumber} />}
                link={{ params: { unit: unit.key }, to: "/food/$unit" }}
              >
                <strong>{unit.label}</strong>
                <small>{name === undefined ? people : `${name} · ${people}`}</small>
              </Row>
            )
          })}
        </Card>
      )}
    </>
  )
}
