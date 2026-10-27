import { useQuery } from "@tanstack/react-query"
import { useId, useMemo, type ReactElement } from "react"

import { fetchAccessQuery } from "../../../data/fetch-access"
import { nameOf, type People, type Person } from "../../../model/Person"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { PersonRow } from "../../components/personrow/PersonRow"

// Constructed once, because a collator is expensive to build and every candidate is
// sorted with it.
const swedish = new Intl.Collator("sv")

/**
 * The most people offered as a list rather than through a search – a unit's handful of
 * leaders, where typing a name would be slower than reading it.
 */
const listedAtMost = 6

/**
 * The case, who is responsible now, and what choosing someone does.
 */
export interface AssignPanelProps {
  /**
   * Who is responsible now, by member number, undefined while nobody is.
   */
  readonly assigneeMemberNo: string | undefined
  /**
   * The case, by identifier, whose access list names who may be chosen.
   */
  readonly caseId: string
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * Makes someone responsible, or nobody, then puts the panel away.
   */
  readonly onAssign: (memberNo: string | undefined) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number, so their own row says it is theirs.
   */
  readonly readerMemberNo: string | undefined
}

interface CandidatesProps {
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The id of the label the list or search is named by.
   */
  readonly labelId: string
  /**
   * The people who could be made responsible, alphabetically.
   */
  readonly offered: readonly string[]
  /**
   * Makes one of them responsible.
   */
  readonly onAssign: (memberNo: string) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number, so their own row says it is theirs.
   */
  readonly readerMemberNo: string | undefined
}

/**
 * The people who could be made responsible – as a list when they are few, and a search
 * when they are many.
 * @param props The people, and what choosing does.
 * @returns The list or the search.
 */
function Candidates(props: CandidatesProps): ReactElement {
  const { offered, onAssign } = props
  const isOffered = useMemo(() => {
    const offeredNos = new Set(offered)
    return (person: Person): boolean => offeredNos.has(person.memberNo)
  }, [offered])

  if (offered.length > listedAtMost) {
    return (
      <PersonPicker
        isBusy={props.isBusy}
        isOffered={isOffered}
        labelId={props.labelId}
        nobodyText="Ingen som ser ärendet heter så."
        onPick={(person) => {
          onAssign(person.memberNo)
        }}
      />
    )
  }
  return (
    <ul aria-labelledby={props.labelId} className="case-person-rows">
      {offered.map((memberNo) => (
        <PersonRow
          action={{
            label: "Välj",
            onPress: () => {
              onAssign(memberNo)
            },
          }}
          isBusy={props.isBusy}
          key={memberNo}
          memberNo={memberNo}
          people={props.people}
          readerMemberNo={props.readerMemberNo}
        />
      ))}
    </ul>
  )
}

/**
 * Choosing who is responsible, in a panel set into the card under the summary: whoever is
 * responsible now with the way to take it from them, then everyone else who can open the
 * case, the reader among them. Only someone who can open the case may be made
 * responsible, so the choices come from the service's own list, asked for as the panel
 * opens.
 * @param props Who is responsible, the reader, and what choosing does.
 * @returns The panel.
 */
export function AssignPanel(props: AssignPanelProps): ReactElement {
  const { assigneeMemberNo, onAssign, people, readerMemberNo } = props
  const id = useId()
  const access = useQuery(fetchAccessQuery(props.caseId))
  const offered = useMemo(
    () =>
      (access.data ?? [])
        .filter((memberNo) => memberNo !== assigneeMemberNo)
        .toSorted((left, right) => swedish.compare(nameOf(people, left), nameOf(people, right))),
    [access.data, assigneeMemberNo, people],
  )

  let status: string | undefined
  if (access.isPending) {
    status = "Hämtar vilka som ser ärendet …"
  } else if (access.isError) {
    status = "Det gick inte att se vilka som kan bli ansvariga."
  } else if (offered.length === 0) {
    status = "Det finns ingen mer som kan bli ansvarig."
  }

  return (
    <div aria-label="Välj ansvarig" className="access-card-panel" role="group">
      <p className="access-card-about">Den som är ansvarig följer upp ärendet.</p>
      {assigneeMemberNo !== undefined && (
        <p className="access-card-label" id={`${id}-now`}>
          Ansvarig nu
        </p>
      )}
      {assigneeMemberNo !== undefined && (
        <ul aria-labelledby={`${id}-now`} className="case-person-rows">
          <PersonRow
            action={{
              isTaking: true,
              label: "Ta bort",
              onPress: () => {
                onAssign(undefined)
              },
              spoken: "Ta bort ansvarig",
            }}
            isBusy={props.isBusy}
            memberNo={assigneeMemberNo}
            people={people}
            readerMemberNo={readerMemberNo}
          />
        </ul>
      )}
      {status !== undefined && (
        <p className="access-card-about" role="status">
          {status}
        </p>
      )}
      {offered.length > 0 && (
        <>
          <p className="access-card-label" id={`${id}-offered`}>
            Kan bli ansvariga
          </p>
          <Candidates
            isBusy={props.isBusy}
            labelId={`${id}-offered`}
            offered={offered}
            onAssign={onAssign}
            people={people}
            readerMemberNo={readerMemberNo}
          />
        </>
      )}
    </div>
  )
}
