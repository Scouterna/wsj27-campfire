import { Button, Card, PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { AllergenGroup, FoodOverview } from "../../../model/food-overview"
import { allergenName, dietName } from "../../../model/HealthProfile"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { roleName } from "../../../model/ParticipantRole"
import { personCount } from "../../counted"
import { FoodRow } from "./FoodRow"
import { GradeSplit } from "./GradeSplit"
import type { RowKey } from "./search"
import { useFoodOverview } from "./use-food-overview"

import "./FoodScreen.css"

export interface FoodScreenProps {
  /**
   * Expands the row, or collapses it.
   */
  readonly onToggle: (key: RowKey) => void
  /**
   * The keys of the expanded rows.
   */
  readonly open: readonly RowKey[]
  /**
   * The unit the address names, as written – not yet known to be a number.
   */
  readonly unit: string
}

/**
 * The line under a name in an allergen's card: the person's other graded allergens and
 * their diet – "Även gluten, vegetarian" – or their role where there is neither.
 * @param person The person the row names.
 * @param group The card the row is in.
 * @returns The line.
 */
function alsoLine(person: ParticipantDetail, group: AllergenGroup): string {
  const others = [
    ...(person.health?.foodAllergy?.severities ?? [])
      .filter(({ allergen }) => allergen !== group.allergen)
      .map(({ allergen }) => allergenName(allergen)),
    ...(person.health?.diet === undefined ? [] : [dietName(person.health.diet.sort)]),
  ]
  return others.length === 0
    ? roleName(person.role)
    : `Även ${others.map((name) => name.toLocaleLowerCase("sv")).join(", ")}`
}

interface OverviewProps extends Omit<FoodScreenProps, "unit"> {
  /**
   * The unit's food needs.
   */
  readonly overview: FoodOverview
  /**
   * The unit the overview is of.
   */
  readonly unitNumber: number
}

/**
 * The overview itself: the unit, who is left out, and a card per allergen, the ungraded
 * allergies, and a card per diet – or one line where nobody has any.
 * @param props The overview, and which rows are expanded.
 * @returns The overview.
 */
function Overview(props: OverviewProps): ReactElement {
  const { allergens, diets, ungraded, withheld } = props.overview
  const isEmpty = allergens.length === 0 && diets.length === 0 && ungraded.length === 0
  const rowFor = (key: RowKey): { isOpen: boolean; onToggle: () => void } => ({
    isOpen: props.open.includes(key),
    onToggle: () => {
      props.onToggle(key)
    },
  })

  return (
    <>
      <p className="food-unit">Avdelning {props.unitNumber}</p>
      {withheld > 0 && (
        <p className="food-note">
          {personCount(withheld)} visas inte, eftersom deras svar inte är dina att läsa.
        </p>
      )}
      {isEmpty ? (
        <p className="food-status" role="status">
          Ingen har angett matallergi eller specialkost.
        </p>
      ) : (
        <div className="food-cards">
          {allergens.map((group) => (
            <Card
              aside={personCount(group.people.length)}
              key={group.allergen}
              title={allergenName(group.allergen)}
            >
              <GradeSplit split={group.split} />
              <ul className="food-rows">
                {group.people.map(({ person, severity }) => (
                  <FoodRow
                    detail={alsoLine(person, group)}
                    key={person.memberNo}
                    person={person}
                    severity={severity}
                    {...rowFor(`allergen-${group.allergen}:${person.memberNo}`)}
                    {...(person.health?.foodAllergy?.details !== undefined && {
                      description: person.health.foodAllergy.details,
                    })}
                  />
                ))}
              </ul>
            </Card>
          ))}
          {ungraded.length > 0 && (
            <Card aside={personCount(ungraded.length)} title="Matallergi utan grad">
              <p className="food-card-line">
                Har angett en matallergi utan att gradera något ämne.
              </p>
              <ul className="food-rows">
                {ungraded.map((person) => (
                  <FoodRow
                    detail={roleName(person.role)}
                    key={person.memberNo}
                    person={person}
                    {...rowFor(`ungraded:${person.memberNo}`)}
                    {...(person.health?.foodAllergy?.details !== undefined && {
                      description: person.health.foodAllergy.details,
                    })}
                  />
                ))}
              </ul>
            </Card>
          )}
          {diets.length > 0 && (
            <section className="food-diets">
              <h2 className="food-diets-title">Specialkost</h2>
              <div className="food-cards">
                {diets.map((group) => (
                  <Card
                    aside={personCount(group.people.length)}
                    key={group.sort}
                    title={dietName(group.sort)}
                  >
                    <ul className="food-rows">
                      {group.people.map((person) => (
                        <FoodRow
                          detail={roleName(person.role)}
                          key={person.memberNo}
                          person={person}
                          {...rowFor(`diet-${group.sort}:${person.memberNo}`)}
                          {...(person.health?.diet?.details !== undefined && {
                            description: person.health.diet.details,
                          })}
                        />
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

/**
 * A unit's diets and food allergies, grouped by allergen with each allergen's people in
 * its card, and the special diets under them – so a leader plans a meal around each
 * allergen, and the health team reads any unit the way its leaders do.
 *
 * Shows nothing about a person that their own page would not show the same reader, and
 * never looks empty when it could not read the unit.
 * @param props The unit, and which rows are expanded.
 * @returns The screen.
 */
export function FoodScreen(props: FoodScreenProps): ReactElement {
  const view = useFoodOverview(props.unit)

  return (
    <>
      <PageTitle title="Kost och allergier" />
      {view.kind === "refused" && (
        <p className="food-status" role="status">
          Avdelningen kunde inte visas.
        </p>
      )}
      {view.kind === "pending" && (
        <p className="food-status" role="status">
          Hämtar avdelningen …
        </p>
      )}
      {view.kind === "failed" && (
        <>
          <p className="food-status" role="status">
            Hälsouppgifterna kunde inte hämtas.
          </p>
          <Button label="Försök igen" onPress={view.refetch} />
        </>
      )}
      {view.kind === "ready" && (
        <Overview
          onToggle={props.onToggle}
          open={props.open}
          overview={view.overview}
          unitNumber={view.unitNumber}
        />
      )}
    </>
  )
}
