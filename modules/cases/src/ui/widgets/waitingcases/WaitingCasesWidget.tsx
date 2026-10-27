import { BackIcon, Card, SegmentedControl, type WidgetFrom } from "@scouterna/wsj27-campfire-ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { fetchCaseTypesQuery } from "../../../data/fetch-case-types"
import { fetchCasesQuery } from "../../../data/fetch-cases"
import { byLastActivity } from "../../../model/Case"
import { inFormOrder, scopeName } from "../../../model/CaseType"
import { isWaiting } from "../../../model/Waiting"
import { CaseRows } from "../../components/caserows/CaseRows"
import { usePeople } from "../../use-people"
import { useChosenType } from "./use-chosen-type"

import "./WaitingCasesWidget.css"

declare module "@scouterna/wsj27-campfire-ui" {
  interface WidgetRegistry {
    /**
     * The latest open cases the reader reaches that wait for someone, all of them or one
     * of their types.
     */
    "cases:waiting": WidgetFrom<"cases">
  }
}

/**
 * The most cases the card shows – the latest, since the section holds them all.
 */
const shownAtMost = 5

/**
 * The latest open cases the reader reaches that wait for someone – nobody follows them up,
 * or nothing new has happened for too long – the one where something last happened
 * first, with a choice in the heading's corner where the reader has more than one type:
 * all of them, or one type, offered in the form's order, so the health team narrows to
 * health or CMT – remembered on the device, so the start screen keeps it. Its rows are
 * the section's own, so a case reads the same here as there. Where more wait than it
 * shows, it ends with how many, leading to them all in the section. With none of any type,
 * and while the list is on its way, it draws nothing, so a start screen holds only what
 * there is to act on – a failed read with nothing to show still draws the card, saying so,
 * and a type narrowed to none keeps it, so the choice can be undone.
 *
 * The home screen places it for whoever has the cases section.
 * @returns The card, or nothing.
 */
export function WaitingCasesWidget(): ReactElement | null {
  const { data, error, isPending } = useQuery(fetchCasesQuery(false))
  const { data: given } = useQuery(fetchCaseTypesQuery())
  const { data: people } = usePeople()
  // A fresh read that failed while an earlier answer is still here shows that answer.
  const failed = data === undefined ? error : null
  const chosen = useChosenType()
  const types = inFormOrder(given ?? [])
  // A type the reader no longer holds narrows to nothing, so it reads as all of them.
  const type = chosen.type !== undefined && types.includes(chosen.type) ? chosen.type : undefined
  // The first choice is every type at once, and each one after it narrows to its type.
  const current = type === undefined ? 0 : types.indexOf(type) + 1
  const at = new Date()
  const waiting = (data ?? []).filter((item) => isWaiting(item, at))
  if (isPending || (failed === null && waiting.length === 0)) {
    return null
  }

  const ofType = byLastActivity(waiting.filter((item) => type === undefined || item.type === type))
  const shown = ofType.slice(0, shownAtMost)

  let status: string | undefined
  if (failed !== null) {
    status = "Ärendena kunde inte hämtas."
  } else if (shown.length === 0) {
    status = "Inga ärenden av den typen."
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
    <Card aside={aside} title="Ärenden som väntar">
      {status === undefined && (
        <CaseRows cases={shown} label="Ärenden som väntar" people={people} />
      )}
      {/* Counted over every type, because the list it opens holds them all. */}
      {status === undefined && waiting.length > shown.length && (
        <p className="waiting-cases-more">
          <Link search={{ lista: "waiting" }} to="/cases">
            Alla {waiting.length} ärenden som väntar
            <span aria-hidden="true" className="waiting-cases-chevron">
              <BackIcon size={16} strokeWidth={2.1} />
            </span>
          </Link>
        </p>
      )}
      {status !== undefined && (
        <p className="waiting-cases-status" role="status">
          {status}
        </p>
      )}
    </Card>
  )
}
