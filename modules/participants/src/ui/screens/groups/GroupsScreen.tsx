import {
  Button,
  Card,
  cmtAvatarNumber,
  istAvatarNumber,
  PageTitle,
  Row,
  SegmentedControl,
  UnitAvatar,
} from "@scouterna/wsj27-campfire-ui"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { groupKinds, type GroupEntry, type GroupKind } from "../../../model/groups"
import { counted, personCount } from "../../counted"
import { toGroupsSearch } from "./search"
import { useGroupEntries } from "./use-groups"

import "./GroupsScreen.css"

/**
 * What a kind of group's card is titled.
 * @param kind The kind of group.
 * @returns The card's title.
 */
function cardTitleOf(kind: GroupKind): string {
  switch (kind) {
    case "avdelningar": {
      return "Avdelningar"
    }
    case "ist": {
      return "IST-patruller"
    }
    case "cmt": {
      return "CMT-funktioner"
    }
  }
}

/**
 * What a kind of group's segment in the filter reads – shorter than its card's title, so
 * the four segments fit a phone's width.
 * @param kind The kind of group.
 * @returns The segment's label.
 */
function segmentLabelOf(kind: GroupKind): string {
  switch (kind) {
    case "avdelningar": {
      return "Avdelningar"
    }
    case "ist": {
      return "IST"
    }
    case "cmt": {
      return "CMT"
    }
  }
}

/**
 * The number behind an entry's mark: a unit's own, or the one the IST or the management
 * wears. An IST patrol and a funktion wear their kind's, because neither has a mark of
 * its own.
 * @param entry The entry.
 * @returns The number whose mark the entry wears.
 */
function avatarNumberOf(entry: GroupEntry): number {
  switch (entry.kind) {
    case "avdelningar": {
      return Number(entry.key)
    }
    case "ist": {
      return istAvatarNumber
    }
    case "cmt": {
      return cmtAvatarNumber
    }
  }
}

/**
 * The line under an entry's label: how many people it holds, led by the unit's or the IST
 * patrol's name where it has one.
 * @param entry The entry.
 * @returns The line.
 */
function subtitleOf(entry: GroupEntry): string {
  const people = personCount(entry.count)
  return entry.name === undefined ? people : `${entry.name} · ${people}`
}

/**
 * The groups view: every unit the viewer may read, the IST patrols with the IST outside
 * them, and the contingent management by funktion, each kind on a card of its own and
 * each entry with how many people it holds. A filter over the cards narrows them to one
 * kind, and is offered only where there is more than one.
 *
 * Derived from the list the section already fetched rather than asked for separately, so
 * opening the view costs nothing – and short enough to read whole, so the rows are
 * plain ones rather than a virtual list.
 * @returns The screen.
 */
export function GroupsScreen(): ReactElement {
  const { entries, error, isPending, refetch } = useGroupEntries()
  const navigate = useNavigate()
  const search = useRouterState({ select: (state) => state.location.search })

  if (isPending) {
    return (
      <>
        <PageTitle title="Grupper" />
        <p className="groups-status" role="status">
          Hämtar deltagarna …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title="Grupper" />
        <p className="groups-status" role="status">
          Deltagarna kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  const present = groupKinds.filter((kind) => entries.some((entry) => entry.kind === kind))
  // A kind the address names but nobody is in shows every kind rather than none.
  const named = toGroupsSearch(search).grupp
  const picked = named !== undefined && present.includes(named) ? named : undefined
  const shown = picked === undefined ? present : [picked]

  return (
    <>
      <PageTitle title="Grupper" />
      {present.length > 1 && (
        <SegmentedControl
          current={picked === undefined ? 0 : present.indexOf(picked) + 1}
          entries={["Alla", ...present.map((kind) => segmentLabelOf(kind))]}
          label="Filtrera efter grupp"
          onPick={(index) => {
            const kind = present[index - 1]
            // Replacing, because filtering is not somewhere the reader went.
            void navigate({
              replace: true,
              search: kind === undefined ? {} : { grupp: kind },
              to: "/participants/groups",
              viewTransition: false,
            })
          }}
        />
      )}
      {entries.length === 0 ? (
        <p className="groups-status" role="status">
          Ingen att visa.
        </p>
      ) : (
        shown.map((kind) => {
          const ofKind = entries.filter((entry) => entry.kind === kind)
          return (
            <Card
              aside={<span aria-hidden="true">{counted(ofKind.length)}</span>}
              key={kind}
              title={cardTitleOf(kind)}
            >
              {ofKind.map((entry) => (
                <Row
                  key={entry.key}
                  leading={<UnitAvatar unitNumber={avatarNumberOf(entry)} />}
                  link={{ params: { group: entry.key }, to: "/participants/groups/$group" }}
                >
                  <strong>{entry.label}</strong>
                  <small>{subtitleOf(entry)}</small>
                </Row>
              ))}
            </Card>
          )
        })
      )}
    </>
  )
}
