import {
  Card,
  IconButton,
  PersonPlusIcon,
  SegmentedControl,
  type WidgetFrom,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"

import { fetchCaseTypesQuery } from "../../../data/fetch-case-types"
import { fetchCasesQuery } from "../../../data/fetch-cases"
import { byLastActivity } from "../../../model/Case"
import { inFormOrder, scopeName } from "../../../model/CaseType"
import { CaseRows } from "../../components/caserows/CaseRows"
import { usePeople } from "../../use-people"
import { useChosenType } from "./use-chosen-type"
import { useTakeCase } from "./use-take-case"

import "./OpenCasesWidget.css"

declare module "@scouterna/wsj27-campfire-ui" {
  interface WidgetRegistry {
    /**
     * The latest open cases the reader reaches but is not responsible for, all of them or
     * one of their types.
     */
    "cases:open": WidgetFrom<"cases">
  }
}

/**
 * The most cases the card shows – the latest, since the section holds them all.
 */
const shownAtMost = 5

/**
 * The latest open cases the reader reaches but is not responsible for, since those have
 * a card of their own – the one where something last happened first, with a choice in the
 * heading's corner where the reader has more than one type: all of them, or one type,
 * offered in the form's order, so the health team narrows to health or CMT – remembered on
 * the device, so the start screen keeps it. A case nobody follows up
 * offers the reader to take it on from its row, the thing they most often do here; one
 * someone already has is theirs to hand on, from the case itself. Reads the same list the
 * cases section holds.
 *
 * The home screen places it for whoever holds a case type.
 * @returns The card.
 */
export function OpenCasesWidget(): ReactElement {
  const { data, error, isPending } = useQuery(fetchCasesQuery(false))
  const { data: given } = useQuery(fetchCaseTypesQuery())
  const { data: people } = usePeople()
  const reader = useUser()
  const chosen = useChosenType()
  const taking = useTakeCase()
  const types = inFormOrder(given ?? [])
  // A type the reader no longer holds narrows to nothing, so it reads as all of them.
  const type = chosen.type !== undefined && types.includes(chosen.type) ? chosen.type : undefined
  // The first choice is every type at once, and each one after it narrows to its type.
  const current = type === undefined ? 0 : types.indexOf(type) + 1
  const ofType = byLastActivity(
    (data ?? []).filter(
      (item) =>
        (type === undefined || item.type === type) &&
        (reader === undefined || item.assigneeMemberNo !== reader.memberNo),
    ),
  )
  const shown = ofType.slice(0, shownAtMost)

  let status: string | undefined
  if (isPending) {
    status = "Hämtar ärendena …"
  } else if (error !== null) {
    status = "Ärendena kunde inte hämtas."
  } else if (shown.length === 0) {
    status = "Inga öppna ärenden."
  } else if (taking.hasFailed) {
    status = "Ärendet kunde inte tilldelas dig."
  }

  // The choice of type takes the heading's corner where there is one to make.
  const aside =
    types.length > 1 ? (
      <SegmentedControl
        current={current}
        entries={["Alla", ...types.map((candidate) => scopeName({ type: candidate }))]}
        label="Typ av ärende"
        onPick={(index) => {
          chosen.choose(index === 0 ? undefined : types.at(index - 1))
        }}
        size="small"
      />
    ) : undefined

  return (
    <Card aside={aside} title="Öppna ärenden">
      {status === undefined || taking.hasFailed ? (
        <CaseRows
          actionFor={(item) =>
            item.assigneeMemberNo === undefined ? (
              <IconButton
                disabled={taking.takingId !== undefined}
                icon={<PersonPlusIcon size={18} />}
                label={`Tilldela mig ${item.title}`}
                onPress={() => {
                  taking.take(item.id)
                }}
              />
            ) : undefined
          }
          cases={shown}
          label="Öppna ärenden"
          people={people}
        />
      ) : null}
      {status !== undefined && (
        <p className="open-cases-status" role="status">
          {status}
        </p>
      )}
    </Card>
  )
}
