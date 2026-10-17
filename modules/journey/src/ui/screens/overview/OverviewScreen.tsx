import {
  Button,
  Card,
  PageTitle,
  Row,
  SegmentedControl,
  UnitAvatar,
  istAvatarNumber,
} from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useMemo, type ReactElement } from "react"

import { fetchPlanQuery } from "../../../data/fetch-journey"
import {
  journeyOf,
  locate,
  type Location,
  type Plan,
  type Traveller,
} from "../../../model/Itinerary"
import { dayKey } from "../journey/days"
import { moment } from "../journey/format"
import { JourneyStrip } from "../journey/JourneyStrip"
import { toJourneySearch } from "../journey/search"
import { UpdatesCard } from "../journey/UpdatesCard"
import { OverviewMap, type OverviewSpot } from "./OverviewMap"

import "./OverviewScreen.css"

// The times of day the overview offers, in Swedish summer time, which is two hours ahead of
// UTC through the whole trip.
const timesOfDay = [
  { hour: 8, label: "Morgon" },
  { hour: 13, label: "Dag" },
  { hour: 19, label: "Kväll" },
  { hour: 23, label: "Natt" },
] as const

/**
 * A day at an hour, Swedish summer time.
 * @param day The day's key.
 * @param hour The hour.
 * @returns The moment.
 */
function atHour(day: string, hour: number): Date {
  return new Date(`${day}T${String(hour - 2).padStart(2, "0")}:00:00Z`)
}

/**
 * The time of day closest to a moment's hour.
 * @param at The moment.
 * @returns The index into the times of day.
 */
function timeOfDay(at: Date): number {
  const hour = Number(
    new Intl.DateTimeFormat("sv-SE", { hour: "numeric", timeZone: "Europe/Stockholm" }).format(at),
  )
  const distance = (index: number): number => Math.abs((timesOfDay.at(index)?.hour ?? 0) - hour)
  let best = 0
  for (const index of timesOfDay.keys()) {
    if (distance(index) < distance(best)) {
      best = index
    }
  }
  return best
}

/**
 * Everyone at one place, as the overview lists them.
 */
interface Group {
  readonly label: string
  readonly members: readonly (readonly [Traveller, Location])[]
}

/**
 * Everyone's location at a moment, grouped by place, the fullest place first.
 * @param plan The plan.
 * @param at The moment.
 * @returns The groups.
 */
function groupsAt(plan: Plan, at: Date): readonly Group[] {
  const byLabel = Map.groupBy(
    plan.travellers.map(
      (traveller) => [traveller, locate(journeyOf(plan, traveller).items, at)] as const,
    ),
    ([, location]) => location.label,
  )
  return byLabel
    .entries()
    .map(([label, members]) => ({ label, members }))
    .toArray()
    .toSorted((a, b) => b.members.length - a.members.length)
}

/**
 * The groups as spots on the map – one per group that has a position.
 * @param groups The groups.
 * @returns The spots.
 */
function spotsOf(groups: readonly Group[]): readonly OverviewSpot[] {
  return groups.flatMap((group) => {
    const position = group.members.find(([, location]) => location.position)?.[1].position
    return position === undefined
      ? []
      : [
          {
            count: group.members.length,
            isMoving: position.isMoving,
            label: group.label,
            position,
          },
        ]
  })
}

/**
 * How many units and patrols, in words.
 * @param members The members.
 * @returns The count, such as "19 avdelningar · 14 patruller".
 */
function counted(members: readonly (readonly [Traveller, Location])[]): string {
  const units = members.filter(([traveller]) => traveller.kind === "avdelning").length
  const patrols = members.length - units
  return [
    plural(units, "avdelning", "avdelningar"),
    plural(patrols, "IST-patrull", "IST-patruller"),
  ]
    .filter((part) => part !== "")
    .join(" · ")
}

/**
 * A count with its noun, or nothing for none.
 * @param count How many.
 * @param one The noun for one.
 * @param many The noun for more.
 * @returns The phrase, empty for zero.
 */
function plural(count: number, one: string, many: string): string {
  if (count === 0) {
    return ""
  }
  return `${String(count)} ${count === 1 ? one : many}`
}

/**
 * The contingent management's overview: where every unit and IST patrol is at a moment, on
 * one map and grouped by place, with every update the planners have posted. A day on the
 * strip and a time of day choose the moment; a unit's row opens its journey at it.
 * @returns The screen.
 */
export function OverviewScreen(): ReactElement {
  const navigate = useNavigate()
  const isManagement = hasAnyRole(useRoles(), "cmt")
  const raw = useRouterState({ select: (state) => state.location.search })
  const search = useMemo(() => toJourneySearch(raw), [raw])
  const at = useMemo(
    () => (search.vid === undefined ? new Date() : new Date(search.vid)),
    [search.vid],
  )
  const plan = useQuery({ ...fetchPlanQuery(), enabled: isManagement })
  const groups = useMemo(
    () => (plan.data === undefined ? [] : groupsAt(plan.data, at)),
    [plan.data, at],
  )
  const spots = useMemo(() => spotsOf(groups), [groups])

  if (!isManagement) {
    return <Status text="Översikten är kontingentledningens." />
  }
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
  const time = timeOfDay(at)
  const go = (when: Date): void => {
    void navigate({
      replace: true,
      search: { vid: when.toISOString() },
      to: "/journey/oversikt",
      viewTransition: false,
    })
  }

  return (
    <>
      <PageTitle title="Översikt" />
      <JourneyStrip
        at={at}
        items={plan.data.items}
        onPick={(midday) => {
          go(atHour(dayKey(midday), timesOfDay.at(time)?.hour ?? 13))
        }}
      />
      <div className="overview-time">
        <SegmentedControl
          current={time}
          entries={timesOfDay.map((entry) => entry.label)}
          label="Tid på dagen"
          onPick={(index) => {
            go(atHour(dayKey(at), timesOfDay.at(index)?.hour ?? 13))
          }}
        />
        <span>{moment(at, "Europe/Stockholm")}</span>
      </div>
      <OverviewMap spots={spots} />
      <UpdatesCard
        at={at}
        reach={(update) => `${String(update.units.length)} berörda`}
        updates={plan.data.updates}
      />
      <Groups at={at} groups={groups} />
    </>
  )
}

type StatusProps = {
  /**
   * What to do about it, where there is anything.
   */
  readonly children?: ReactElement
  /**
   * What the screen says in place of the overview.
   */
  readonly text: string
}

/**
 * The screen while the plan loads, after it failed, or for a reader it is not for.
 * @param props The words and what to do.
 * @returns The screen.
 */
function Status(props: StatusProps): ReactElement {
  return (
    <>
      <PageTitle title="Översikt" />
      <p className="overview-status" role="status">
        {props.text}
      </p>
      {props.children}
    </>
  )
}

type GroupsProps = {
  /**
   * The moment looked at, which a unit's journey opens at.
   */
  readonly at: Date
  /**
   * Everyone, grouped by place.
   */
  readonly groups: readonly Group[]
}

/**
 * Everyone grouped by place, a card per place and a row per unit or patrol that opens its
 * journey at the same moment.
 * @param props The moment and the groups.
 * @returns The cards.
 */
function Groups(props: GroupsProps): ReactElement {
  const { at, groups } = props
  return (
    <>
      {groups.map((group) => (
        <Card key={group.label} aside={counted(group.members)} title={group.label}>
          {group.members.map(([traveller, location]) => (
            <Row
              key={traveller.key}
              leading={
                <UnitAvatar
                  unitNumber={traveller.kind === "ist" ? istAvatarNumber : traveller.number}
                />
              }
              link={{
                search: { enhet: traveller.key, vid: at.toISOString() },
                to: "/journey",
              }}
            >
              <strong>{traveller.name}</strong>
              <small>{location.doing ?? traveller.travelGroup ?? ""}</small>
            </Row>
          ))}
        </Card>
      ))}
    </>
  )
}
