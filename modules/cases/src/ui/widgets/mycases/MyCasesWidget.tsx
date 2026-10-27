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
 * start screen for. Reads the open cases the other card reads, so the two cost one
 * request. With none, and while the list is on its way, it draws nothing, so a start
 * screen holds only what there is to act on – a failed read with nothing to show still
 * draws the card, saying so, so it is never mistaken for having none.
 * @returns The card, or nothing.
 */
export function MyCasesWidget(): ReactElement | null {
  const reader = useUser()
  const { data, error, isPending } = useQuery(fetchCasesQuery(false))
  const { data: people } = usePeople()
  // A fresh read that failed while an earlier answer is still here shows that answer.
  const failed = data === undefined ? error : null
  const mine = byLastActivity(
    (data ?? []).filter(
      (item) => reader !== undefined && item.assigneeMemberNo === reader.memberNo,
    ),
  )

  if (isPending || (failed === null && mine.length === 0)) {
    return null
  }

  return (
    <Card title="Ärenden du är ansvarig för">
      {failed === null ? (
        <CaseRows cases={mine} label="Ärenden du är ansvarig för" people={people} />
      ) : (
        <p className="my-cases-status" role="status">
          Ärendena kunde inte hämtas.
        </p>
      )}
    </Card>
  )
}
