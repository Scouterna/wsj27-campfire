import {
  Button,
  Card,
  PageActions,
  PageJumps,
  PageTitle,
  ParticipantsIcon,
  SearchField,
  SearchIcon,
  SegmentedControl,
  type OverflowMenuItem,
} from "@scouterna/wsj27-campfire-ui"
import { useRoles } from "@scouterna/wsj27-campfire-utils"
import { useMemo, type ReactElement } from "react"

import { useViewer } from "../../../data/viewer"
import { narrow, type RoleFilter } from "../../../model/narrowing"
import type { Participant } from "../../../model/Participant"
import type { ListScope } from "../../../model/ParticipantsList"
import { patrolSections } from "../../../model/Patrol"
import { EmptyState } from "../../components/emptystate/EmptyState"
import { counted, personCount } from "../../counted"
import { useCareSheets, type CareSheets } from "../../use-care-sheets"
import { GroupedPatrols } from "./GroupedPatrols"
import { PeopleList } from "./PeopleList"
import { participantsSectionLabel } from "./section-label"
import { useAddressMenu } from "./use-address-menu"
import { useLetterJumps } from "./use-letter-jumps"
import { useNarrowing } from "./use-narrowing"
import { useParticipants } from "./use-participants"

import "./ParticipantsScreen.css"

/**
 * The filter's segments, in the order they are offered rather than alphabetically –
 * "Alla" first because it is the list's resting state, then the roles from the largest
 * group down.
 */
const segments: readonly { readonly filter: RoleFilter | undefined; readonly label: string }[] = [
  { filter: undefined, label: "Alla" },
  { filter: "deltagare", label: "Deltagare" },
  { filter: "ledare", label: "Ledare" },
  { filter: "ist", label: "IST" },
  { filter: "cmt", label: "CMT" },
]

/**
 * The unit scope's segments: a unit holds deltagare and ledare, so offering IST and
 * CMT would be filters that can never match anyone.
 */
const unitSegments = segments.slice(0, 3)

// Constructed once, because a formatter is expensive to build and the count line is
// rewritten on every keystroke.
const swedish = new Intl.NumberFormat("sv-SE")

// The title row's one action, the way into the groups view at every width. A link
// rather than a handler, so the navigation animates and remembers itself like any other,
// and a constant, because the chrome republishes what it is handed.
const unitsAction = {
  icon: <ParticipantsIcon size={24} strokeWidth={2.2} />,
  label: "Grupper",
  link: { to: "/participants/groups" },
} as const

// A leader's way in to dividing their unit, where the management's is the groups view.
const patrolsAction = {
  icon: <ParticipantsIcon size={24} strokeWidth={2.2} />,
  label: "Patruller",
  link: { to: "/participants/patrols" },
} as const

// A leader's way in while the list is the whole contingent's, where the primary action is
// the groups view, because somebody in the management who also leads a unit has no other.
const patrolsEntries: readonly OverflowMenuItem[] = [
  { label: "Patruller", link: { to: "/participants/patrols" } },
]

/**
 * The page's primary action for what the list covers: the groups view for the whole
 * contingent, the patrols for a leader's own unit, and nothing for nobody.
 * @param scope What the list is a list of.
 * @returns The action, or undefined for none.
 */
function actionFor(scope: ListScope): typeof patrolsAction | typeof unitsAction | undefined {
  switch (scope.kind) {
    case "all": {
      return unitsAction
    }
    case "unit": {
      return patrolsAction
    }
    case "nobody": {
      return undefined
    }
  }
}

// The designed empty answers, constant because their words never depend on the render.
// An empty scope has nothing to narrow, while an empty search has a way forward.
const nobodyState = (
  <EmptyState
    hint="Listan med deltagare är tom just nu."
    icon={<ParticipantsIcon size={28} strokeWidth={1.8} />}
    title="Ingen att visa"
  />
)

const nothingMatchedState = (
  <EmptyState
    hint="Prova ett annat namn, eller byt filter."
    icon={<SearchIcon size={28} strokeWidth={1.8} />}
    title="Inga träffar"
  />
)

/**
 * What the screen is doing, for the one line that says so.
 */
interface Status {
  readonly error: Error | null
  readonly found: number
  readonly isNarrowed: boolean
  readonly isPending: boolean
  readonly scope: ListScope
  readonly total: number
}

/**
 * The one sentence under the filter, whatever the screen is doing.
 *
 * Every state has its own words, so the line never reads as an answer it is not: a list
 * still on its way is not an empty one, and a refusal is not "nobody here".
 * @param status What the screen is doing.
 * @returns The sentence to announce.
 */
function statusOf(status: Status): string {
  if (status.isPending) {
    return "Hämtar deltagarna …"
  }
  if (status.error !== null) {
    return "Deltagarna kunde inte hämtas."
  }
  if (status.total === 0) {
    return "Ingen att visa."
  }
  if (status.found === 0) {
    return "Inga träffar."
  }
  if (status.isNarrowed) {
    return `${swedish.format(status.found)} av ${swedish.format(status.total)} personer`
  }
  const where = status.scope.kind === "unit" ? "avdelningen" : "kontingenten"
  return `${personCount(status.total)} i ${where}`
}

/**
 * The people a `FoundPeople` draws, and what heads them.
 */
interface FoundPeopleProps {
  /**
   * The care of the leader's unit, read once by the screen, so a list that changes shape
   * as the search narrows neither reads it again nor closes an open sheet.
   */
  readonly care: CareSheets
  /**
   * The people the search and the roles left.
   */
  readonly found: readonly Participant[]
  /**
   * Whether the list is one unit's, which reads by patrol once any of them is in one.
   */
  readonly isUnitScoped: boolean
  /**
   * What sends the list back to its top – the search and the role together.
   */
  readonly resetKey: string
  /**
   * The heading over the flat list, the role the list is narrowed to.
   */
  readonly title: string
  /**
   * How many people the list holds before it is narrowed.
   */
  readonly total: number
}

/**
 * What the search found: a unit's people by patrol, as the management's page for the unit
 * shows them, or everybody else in one name-sorted list with the outline's letter stops.
 * @param props The people, their care, and what heads them.
 * @returns The cards.
 */
function FoundPeople(props: FoundPeopleProps): ReactElement {
  const { care, found, isUnitScoped } = props
  const patrols = useMemo(() => (isUnitScoped ? patrolSections(found) : []), [found, isUnitScoped])
  const jumps = useLetterJumps(found)

  if (patrols.length > 0) {
    return (
      <GroupedPatrols
        care={care}
        leaders={found.filter((person) => person.role === "ledare")}
        sections={patrols}
      />
    )
  }
  return (
    <>
      {/* The outline's stops over the name-sorted rows – declared, because the
          virtualized rows are not in the document for the outline to scan. */}
      <PageJumps current={jumps.current} entries={jumps.entries} onJump={jumps.onJump} />
      <Card
        aside={<span aria-hidden="true">{counted(found.length, props.total)}</span>}
        title={props.title}
      >
        <PeopleList
          care={care}
          isUnitScoped={isUnitScoped}
          onFirstVisibleChange={jumps.onFirstVisible}
          people={found}
          registerJump={jumps.registerJump}
          resetKey={props.resetKey}
        />
      </Card>
    </>
  )
}

/**
 * The section root: everyone the viewer may read, narrowed by a search and by the roles,
 * each row a doorway into the person.
 *
 * A leader searches and narrows their unit exactly as the management narrows the
 * contingent – in a unit's smaller vocabulary – but the way in by unit stays the
 * management's, because a leader already has the only unit they may read.
 * @returns The screen.
 */
export function ParticipantsScreen(): ReactElement {
  const roles = useRoles()
  const viewer = useViewer()
  const { error, isPending, people, refetch, scope } = useParticipants()
  const { onText, pickRole, query, roll: rawRoll, text } = useNarrowing()

  const isWholeContingent = scope.kind === "all"
  const offered = isWholeContingent ? segments : unitSegments
  // A roll the chips do not offer – a bookmarked cmt filter opened in unit scope –
  // narrows nothing, because a filter no chip shows is an invisible one.
  const roll = offered.some((segment) => segment.filter === rawRoll) ? rawRoll : undefined

  const isUnitScoped = scope.kind === "unit"
  const found = useMemo(
    () => narrow(people, query, roll, isUnitScoped),
    [isUnitScoped, people, query, roll],
  )
  // Mailing and copying act on the list as it is narrowed, so narrowing is how somebody
  // chooses who to write to.
  const addressMenu = useAddressMenu(found, roles)
  const care = useCareSheets(found)
  const isLeaderToo = isWholeContingent && viewer.unitNumber !== undefined
  const menu = useMemo(
    () =>
      isLeaderToo
        ? [
            ...patrolsEntries,
            ...(addressMenu === undefined ? [] : ["divider" as const, ...addressMenu]),
          ]
        : addressMenu,
    [addressMenu, isLeaderToo],
  )

  const isNarrowed = query !== "" || roll !== undefined
  const isSettled = !isPending && error === null
  const isNobody = isSettled && people.length === 0
  const isNothingMatched = isSettled && people.length > 0 && found.length === 0
  const isEmptyHandled = isNobody || isNothingMatched
  // The count a sighted reader gets is the list heading's – the status line shows only
  // while it has something the heading cannot say, the fetching and the failing.
  const statusClass =
    (isEmptyHandled || found.length > 0) && error === null
      ? "participants-status participants-status-spoken"
      : "participants-status"
  const status = statusOf({
    error,
    found: found.length,
    isNarrowed,
    isPending,
    scope,
    total: people.length,
  })

  return (
    <>
      <PageTitle title={participantsSectionLabel(roles)} />

      {/* One declaration for both: the chrome holds a single one, so a second would
          replace the first rather than join it. */}
      <PageActions action={actionFor(scope)} menu={menu} />

      <SearchField
        label="Sök deltagare"
        onChange={(event) => {
          onText(event.target.value)
        }}
        placeholder="Sök deltagare"
        value={text}
      />

      <SegmentedControl
        current={Math.max(
          0,
          offered.findIndex((segment) => segment.filter === roll),
        )}
        entries={offered.map((segment) => segment.label)}
        label="Filtrera efter roll"
        onPick={(index) => {
          pickRole(offered.at(index)?.filter)
        }}
      />

      <p className={statusClass} role="status">
        {status}
      </p>

      {!isPending && error !== null && <Button label="Försök igen" onPress={refetch} />}

      {isNobody && nobodyState}
      {isNothingMatched && nothingMatchedState}

      {care.notice}
      {found.length > 0 && (
        <FoundPeople
          care={care}
          found={found}
          isUnitScoped={isUnitScoped}
          resetKey={`${query}|${roll ?? ""}`}
          title={offered.find((segment) => segment.filter === roll)?.label ?? "Alla"}
          total={people.length}
        />
      )}
      {care.sheet}
    </>
  )
}
