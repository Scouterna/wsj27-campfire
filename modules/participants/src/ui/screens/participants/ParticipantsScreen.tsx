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
  useUnitIdentities,
} from "@scouterna/wsj27-campfire-ui"
import { useRoles } from "@scouterna/wsj27-campfire-utils"
import { useMemo, type ReactElement } from "react"

import { narrow, type RoleFilter } from "../../../model/narrowing"
import type { ListScope } from "../../../model/ParticipantsList"
import { counted, personCount } from "../../counted"
import { EmptyState } from "../../emptystate/EmptyState"
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
 * CMT would be two filters that can never match anyone.
 */
const unitSegments = segments.slice(0, 3)

// Constructed once: a formatter is expensive to build, and the count line is rewritten on
// every keystroke.
const swedish = new Intl.NumberFormat("sv-SE")

// The way into the unit browser: the title row's one action, at every width. A link
// rather than a handler, so the navigation animates and remembers itself like any
// other. A constant, because the chrome republishes what it is handed.
const unitsAction = {
  icon: <ParticipantsIcon size={24} strokeWidth={2.2} />,
  label: "Avdelningar",
  link: { to: "/participants/units" },
} as const

// The two designed empty answers, constants because their words never depend on the
// render: an empty scope has nothing to narrow, and an empty search has a way forward.
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
 * The section root: everyone the viewer may read, narrowed by a search and by the roles,
 * each row a doorway into the person.
 *
 * The narrowing lives in the address rather than in the screen, so a narrowed list can be
 * shared, bookmarked, and returned to – while the field itself stays locally controlled,
 * because a field that waits for a round trip through the router drops keystrokes. The
 * address catches up once the typing settles.
 *
 * A leader searches and narrows their unit exactly as the management narrows the
 * contingent – in a unit's smaller vocabulary – but the way in by unit stays the
 * management's, because a leader already has the only unit they may read.
 * @returns The screen.
 */
export function ParticipantsScreen(): ReactElement {
  const roles = useRoles()
  const { error, isPending, people, refetch, scope } = useParticipants()
  const { onText, pickRole, query, roll: rawRoll, text } = useNarrowing()

  const isWholeContingent = scope.kind === "all"
  // A unit's list is searched and narrowed like the contingent's, in its own smaller
  // vocabulary; only the way in by unit stays the management's.
  const offered = isWholeContingent ? segments : unitSegments
  // A roll the chips do not offer – a bookmarked cmt filter opened in unit scope –
  // narrows nothing, because a filter no chip shows is an invisible one.
  const roll = offered.some((segment) => segment.filter === rawRoll) ? rawRoll : undefined

  const nameOf = useUnitIdentities().name
  const found = useMemo(() => narrow(people, query, roll, nameOf), [nameOf, people, query, roll])
  const jumps = useLetterJumps(found)
  // Mailing and copying act on the list as it is narrowed, so narrowing is how somebody
  // chooses who to write to.
  const addressMenu = useAddressMenu(found, roles)

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
      <PageActions action={isWholeContingent ? unitsAction : undefined} menu={addressMenu} />

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

      {/* The one line assistive technology hears, whatever the screen is doing – spoken
          but unshown where a designed empty block carries the same answer visually. */}
      <p className={statusClass} role="status">
        {status}
      </p>

      {!isPending && error !== null && <Button label="Försök igen" onPress={refetch} />}

      {isNobody && nobodyState}
      {isNothingMatched && nothingMatchedState}

      {found.length > 0 && (
        <>
          {/* The outline's stops over the name-sorted rows – declared, because the
              virtualized rows are not in the document for the outline to scan. */}
          <PageJumps current={jumps.current} entries={jumps.entries} onJump={jumps.onJump} />
          <Card
            aside={<span aria-hidden="true">{counted(found.length, people.length)}</span>}
            title={offered.find((segment) => segment.filter === roll)?.label ?? "Alla"}
          >
            <PeopleList
              onFirstVisibleChange={jumps.onFirstVisible}
              people={found}
              registerJump={jumps.registerJump}
              resetKey={`${query}|${roll ?? ""}`}
            />
          </Card>
        </>
      )}
    </>
  )
}
