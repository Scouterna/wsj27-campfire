import { Card, type WidgetFrom } from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"

import { fetchCasesQuery } from "../../../data/fetch-cases"
import { byLastActivity } from "../../../model/Case"
import { CaseRows } from "../../components/caserows/CaseRows"
import { usePeople } from "../../use-people"

import "./MyCasesWidget.css"

declare module "@scouterna/wsj27-campfire-ui" {
  interface WidgetRegistry {
    /**
     * The open cases the reader is responsible for following up.
     */
    "cases:mine": WidgetFrom<"cases">
  }
}

/**
 * The open cases the reader is responsible for, the one where something last happened
 * first, each a doorway into the case – what someone who follows cases up comes to the
 * start screen for. Reads the same list the cases section holds, so opening the section
 * afterwards costs no request. With none, it says so in a line, because an empty card
 * would read as one that failed.
 *
 * The home screen places it for whoever holds a case type.
 * @returns The card.
 */
export function MyCasesWidget(): ReactElement {
  const reader = useUser()
  const { data, error, isPending } = useQuery(fetchCasesQuery(false))
  const { data: people } = usePeople()
  const mine = byLastActivity(
    (data ?? []).filter(
      (item) => reader !== undefined && item.assigneeMemberNo === reader.memberNo,
    ),
  )

  let status: string | undefined
  if (isPending) {
    status = "Hämtar ärendena …"
  } else if (error !== null) {
    status = "Ärendena kunde inte hämtas."
  } else if (mine.length === 0) {
    status = "Inga ärenden är tilldelade dig."
  }

  return (
    <Card title="Mina ärenden">
      {status === undefined ? (
        <CaseRows cases={mine} label="Mina ärenden" people={people} />
      ) : (
        <p className="my-cases-status" role="status">
          {status}
        </p>
      )}
    </Card>
  )
}
