import {
  Button,
  Card,
  PageTitle,
  Row,
  SearchField,
  unitsReveal,
  useIsRevealed,
  VirtualList,
} from "@scouterna/wsj27-campfire-ui"
import { memo, useMemo, useState, type ReactElement } from "react"

import { isMatch, type ImpersonationTarget } from "../../../model/ImpersonationTarget"
import { roleLineFor, roleLineWithUnitFor } from "../../../model/User"
import { TargetMark } from "../../components/targetmark/TargetMark"
import { useImpersonationOffer, useImpersonationTargets } from "../../use-impersonation"

import "./ImpersonationScreen.css"

/**
 * The design's row height at the default text size, for the list to guess with before it
 * measures.
 */
const estimatedRowHeight = 72

const swedish = new Intl.NumberFormat("sv-SE")

interface TargetRowProps {
  /**
   * Whether the units reveal is open, so the row may name the unit.
   */
  readonly isUnitShown: boolean
  /**
   * The person the row names and leads to.
   */
  readonly target: ImpersonationTarget
}

/**
 * One row – a doorway to being shown Campfire as the person. Memoized on its props,
 * because searching re-renders the list with most of its rows unchanged.
 */
const TargetRow = memo(function TargetRow(props: TargetRowProps): ReactElement {
  const { isUnitShown, target } = props
  return (
    <Row
      leading={<TargetMark isUnitShown={isUnitShown} target={target} />}
      link={{ params: { memberNo: target.memberNo }, to: "/profile/impersonate/$memberNo" }}
    >
      <strong>{target.name}</strong>
      <small>
        {isUnitShown ? roleLineWithUnitFor(target.roles, target.unit) : roleLineFor(target.roles)}
      </small>
    </Row>
  )
})

/**
 * What the screen is doing, for the one line that says so.
 */
interface Status {
  readonly error: Error | null
  readonly found: number
  readonly isOffered: boolean | undefined
  readonly isPending: boolean
  readonly query: string
  readonly total: number
}

/**
 * The one sentence under the search, whatever the screen is doing. Every state has its
 * own words, so the line never reads as an answer it is not.
 * @param status What the screen is doing.
 * @returns The sentence to announce.
 */
function statusOf(status: Status): string {
  if (status.isOffered === false) {
    return "Det går inte att visa Campfire som någon annan här."
  }
  if (status.isOffered === undefined || status.isPending) {
    return "Hämtar ledare och kontingentledning …"
  }
  if (status.error !== null) {
    return "Listan kunde inte hämtas."
  }
  if (status.total === 0) {
    return "Det finns ingen att visa Campfire som."
  }
  if (status.found === 0) {
    return "Inga träffar."
  }
  return status.query.trim() === ""
    ? `${swedish.format(status.total)} personer`
    : `${swedish.format(status.found)} av ${swedish.format(status.total)} personer`
}

/**
 * The picker: everybody the signed-in person may be shown Campfire as – the leaders and
 * the contingent management – narrowed by name, each row a doorway to the confirmation.
 * Where the auth service does not offer it, the screen says so and reads nothing.
 * @returns The screen.
 */
export function ImpersonationScreen(): ReactElement {
  const [query, setQuery] = useState("")
  const isUnitShown = useIsRevealed(unitsReveal.id)
  const isOffered = useImpersonationOffer()
  const { error, isPending, refetch, targets } = useImpersonationTargets(isOffered === true)

  const found = useMemo(() => targets.filter((target) => isMatch(target, query)), [targets, query])

  const status = statusOf({
    error,
    found: found.length,
    isOffered,
    isPending,
    query,
    total: targets.length,
  })

  return (
    <>
      <PageTitle title="Visa som någon annan" />
      <p className="impersonation-screen-intro">
        Se Campfire precis som en ledare eller någon i kontingentledningen ser det – med deras
        roller, deras avdelning och deras behörighet.
      </p>

      {isOffered === true && (
        <SearchField
          label="Sök namn"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder="Sök namn"
          value={query}
        />
      )}

      <p className="impersonation-screen-status" role="status">
        {status}
      </p>

      {isOffered === true && !isPending && error !== null && (
        <Button label="Försök igen" onPress={refetch} variant="plain" />
      )}

      {found.length > 0 && (
        <Card>
          <VirtualList
            estimatedRowHeight={estimatedRowHeight}
            items={found}
            keyOf={(target) => target.memberNo}
            label="Personer att visa Campfire som"
            renderRow={(target) => <TargetRow isUnitShown={isUnitShown} target={target} />}
            resetKey={query}
          />
        </Card>
      )}
    </>
  )
}
