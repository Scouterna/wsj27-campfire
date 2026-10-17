import { Button, Card, FieldList, PageTitle, type FieldRow } from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles, useUser } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useMemo, type ReactElement } from "react"

import { fetchPlanQuery } from "../../../data/fetch-journey"
import {
  isCovering,
  journeyOf,
  locate,
  whereabouts,
  zoneOf,
  type Plan,
  type Traveller,
  type UnitJourney,
} from "../../../model/Itinerary"
import { moment, span, whereLine } from "./format"
import { JourneyStrip } from "./JourneyStrip"
import { RouteMap } from "./map/RouteMap"
import { toJourneySearch, type JourneySearch } from "./search"
import { Timeline } from "./Timeline"
import { UpdatesCard } from "./UpdatesCard"

import "./JourneyScreen.css"

/**
 * Whose journey the screen shows: a leader's own unit, always; for the contingent
 * management, the one the address names, or the first unit.
 * @param plan The plan.
 * @param isManagement Whether the reader is in the contingent management.
 * @param ownUnit The reader's own unit's number, for a leader.
 * @param asked The key the address names.
 * @returns The traveller, or undefined when the reader has none.
 */
function travellerFor(
  plan: Plan,
  isManagement: boolean,
  ownUnit: number | undefined,
  asked: string | undefined,
): Traveller | undefined {
  if (isManagement) {
    return plan.travellers.find((traveller) => traveller.key === asked) ?? plan.travellers[0]
  }
  return plan.travellers.find(
    (traveller) => traveller.kind === "avdelning" && traveller.number === ownUnit,
  )
}

/**
 * A unit's journey: the trip as a strip of days, the planners' updates, where the unit is
 * beside the map, and the whole itinerary as a rail. A leader always sees their own unit;
 * the contingent management picks any unit or IST patrol, and reaches the overview of
 * everyone from here. A day on the strip moves the moment, which lives in the address.
 * @returns The screen.
 */
export function JourneyScreen(): ReactElement {
  const navigate = useNavigate()
  const isManagement = hasAnyRole(useRoles(), "cmt")
  const ownUnit = useUser()?.unit?.number
  const raw = useRouterState({ select: (state) => state.location.search })
  const search = useMemo(() => toJourneySearch(raw), [raw])
  const at = useMemo(
    () => (search.vid === undefined ? new Date() : new Date(search.vid)),
    [search.vid],
  )
  const plan = useQuery(fetchPlanQuery())

  if (plan.isPending) {
    return <Status text="Hämtar resplanen …" />
  }
  if (plan.isError) {
    return (
      <Status text="Resplanen kunde inte hämtas.">
        <Button label="Försök igen" onPress={() => void plan.refetch()} />
      </Status>
    )
  }
  const traveller = travellerFor(plan.data, isManagement, ownUnit, search.enhet)
  if (traveller === undefined) {
    return <Status text="Det finns ingen resplan för dig ännu." />
  }
  const journey = journeyOf(plan.data, traveller)
  const go = (next: JourneySearch): void => {
    void navigate({ replace: true, search: next, to: "/journey", viewTransition: false })
  }

  return (
    <>
      <PageTitle title="Resan" />
      {isManagement ? (
        <Picker
          at={at}
          selected={traveller}
          travellers={plan.data.travellers}
          onPick={(key) => {
            go({ ...search, enhet: key })
          }}
        />
      ) : null}
      <JourneyStrip
        at={at}
        items={journey.items}
        onPick={(when) => {
          go({ ...search, vid: when.toISOString() })
        }}
      />
      <UpdatesCard at={at} updates={journey.updates} />
      <div className="journey-overview">
        <Whereabouts at={at} journey={journey} />
        <section className="journey-map">
          <RouteMap at={at} items={journey.items} />
        </section>
      </div>
      <Timeline at={at} items={journey.items} />
    </>
  )
}

type StatusProps = {
  /**
   * What to do about it, where there is anything.
   */
  readonly children?: ReactElement
  /**
   * What the screen says in place of the journey.
   */
  readonly text: string
}

/**
 * The screen while the plan loads, after it failed, or when there is no journey to show.
 * @param props The words and what to do.
 * @returns The screen.
 */
function Status(props: StatusProps): ReactElement {
  return (
    <>
      <PageTitle title="Resan" />
      <p className="journey-status" role="status">
        {props.text}
      </p>
      {props.children}
    </>
  )
}

type PickerProps = {
  /**
   * The moment looked at, which the overview opens at.
   */
  readonly at: Date
  /**
   * Picks another unit or patrol by key.
   */
  readonly onPick: (key: string) => void
  /**
   * Whose journey is shown.
   */
  readonly selected: Traveller
  /**
   * Every unit and patrol.
   */
  readonly travellers: readonly Traveller[]
}

/**
 * The contingent management's choice of unit or IST patrol, and the way to the overview.
 * @param props The travellers, the one shown, and what a pick does.
 * @returns The controls.
 */
function Picker(props: PickerProps): ReactElement {
  const { at, onPick, selected, travellers } = props
  const option = (traveller: Traveller): ReactElement => (
    <option key={traveller.key} value={traveller.key}>
      {traveller.name}
      {traveller.travelGroup === undefined ? "" : ` – ${traveller.travelGroup}`}
    </option>
  )
  return (
    <div className="journey-controls">
      <label className="journey-field">
        <span>Avdelning eller IST-patrull</span>
        <select
          value={selected.key}
          onChange={(event) => {
            onPick(event.target.value)
          }}
        >
          <optgroup label="Avdelningar">
            {travellers
              .filter((traveller) => traveller.kind === "avdelning")
              .map((traveller) => option(traveller))}
          </optgroup>
          <optgroup label="IST-patruller">
            {travellers
              .filter((traveller) => traveller.kind === "ist")
              .map((traveller) => option(traveller))}
          </optgroup>
        </select>
      </label>
      <Link
        className="journey-overview-link"
        search={{ vid: at.toISOString() }}
        to="/journey/oversikt"
      >
        Var är alla? Öppna översikten →
      </Link>
    </div>
  )
}

type WhereaboutsProps = {
  /**
   * The moment looked at.
   */
  readonly at: Date
  /**
   * The unit's journey.
   */
  readonly journey: UnitJourney
}

/**
 * Where the unit is at the moment – doing, where, sleeping, next – and who is elsewhere.
 * @param props The moment and the journey.
 * @returns The card.
 */
function Whereabouts(props: WhereaboutsProps): ReactElement {
  const { at, journey } = props
  const where = whereabouts(journey.items, at)
  const isAsleep = where.sleeping !== undefined && isCovering(where.sleeping, at)
  const away = journey.exceptions.filter((exception) => exception.start <= at && at < exception.end)
  const fields: FieldRow[] = [
    {
      label: "Gör",
      value:
        where.doing.length === 0
          ? "Inget planerat"
          : where.doing.map((item) => item.title).join(", "),
    },
    { label: "Var", value: locate(journey.items, at).label },
    {
      label: isAsleep ? "Sover" : "Sover i natt",
      value:
        where.sleeping === undefined
          ? "–"
          : `${whereLine(where.sleeping) || where.sleeping.title} · ${span(where.sleeping)}`,
    },
    {
      label: "Härnäst",
      value:
        where.next === undefined
          ? "–"
          : `${where.next.title} · ${moment(where.next.start, zoneOf(where.next))}`,
    },
    ...away.map((exception) => ({
      label: "Inte med avdelningen",
      value: exception.title,
      ...(exception.reason !== undefined && { quote: exception.reason }),
    })),
  ]
  return (
    <Card aside={moment(at, "Europe/Stockholm")} title={`Läget för ${journey.traveller.name}`}>
      <div className="journey-now">
        {journey.traveller.travelGroup === undefined ? null : (
          <p className="journey-group">{journey.traveller.travelGroup}</p>
        )}
        <FieldList fields={fields} />
      </div>
    </Card>
  )
}
