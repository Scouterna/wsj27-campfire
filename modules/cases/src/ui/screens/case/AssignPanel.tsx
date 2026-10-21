import { useQuery } from "@tanstack/react-query"
import { useId, useMemo, type ReactElement } from "react"

import { fetchAccessQuery } from "../../../data/fetch-access"
import { nameOf, type People, type Person } from "../../../model/Person"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { PersonRow } from "./PersonRow"

// Constructed once, because a collator is expensive to build and every candidate is
// sorted with it.
const swedish = new Intl.Collator("sv")

/**
 * The most people offered as a list rather than through a search – a unit's handful of
 * leaders, where typing a name would be slower than reading it.
 */
const listedAtMost = 6

export interface AssigneeLineProps {
  /**
   * Whether the case can change hands, so a case nobody follows up says so.
   */
  readonly canAssign: boolean
  /**
   * Who is responsible, by member number, undefined while nobody is.
   */
  readonly memberNo: string | undefined
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number, so a case of theirs says so.
   */
  readonly readerMemberNo: string | undefined
}

/**
 * Who is responsible for following the case up, in a quiet line under who sees it – the
 * case's business rather than its headline.
 * @param props The person.
 * @returns The line, or nothing for a case nobody follows up that cannot change hands.
 */
export function AssigneeLine(props: AssigneeLineProps): ReactElement | null {
  const { memberNo } = props
  if (memberNo === undefined) {
    return props.canAssign ? <p className="access-card-assignee">Ingen ansvarig</p> : null
  }
  const ownMark = memberNo === props.readerMemberNo ? " (du)" : ""
  return (
    <p className="access-card-assignee">
      Ansvarig: {nameOf(props.people, memberNo)}
      {ownMark}
    </p>
  )
}

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
   * The reader's own member number, who takes a case on from the card itself and so is not
   * offered here.
   */
  readonly readerMemberNo: string | undefined
}

interface CandidatesProps {
  /**
   * The id of the label the list or search is named by.
   */
  readonly labelId: string
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
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
        isOffered={isOffered}
        labelId={props.labelId}
        nobodyText="Ingen som ser ärendet heter så."
        onPick={(person) => {
          if (person !== undefined) {
            onAssign(person.memberNo)
          }
        }}
        picked={undefined}
      />
    )
  }
  return (
    <ul aria-labelledby={props.labelId} className="access-card-people">
      {offered.map((memberNo) => (
        <PersonRow
          action={{
            label: "Tilldela",
            onPress: () => {
              onAssign(memberNo)
            },
          }}
          isBusy={props.isBusy}
          key={memberNo}
          memberNo={memberNo}
          people={props.people}
        />
      ))}
    </ul>
  )
}

/**
 * Choosing who is responsible, in a panel set into the card like sharing: whoever is
 * responsible now with the way to take it from them, then everyone else who can open the
 * case. Only someone who can open the case may be made responsible, so the choices come
 * from the service's own list, asked for as the panel opens.
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
        .filter((memberNo) => memberNo !== assigneeMemberNo && memberNo !== readerMemberNo)
        .toSorted((left, right) => swedish.compare(nameOf(people, left), nameOf(people, right))),
    [access.data, assigneeMemberNo, people, readerMemberNo],
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
        <ul aria-labelledby={`${id}-now`} className="access-card-people">
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
            Andra som ser ärendet
          </p>
          <Candidates
            isBusy={props.isBusy}
            labelId={`${id}-offered`}
            offered={offered}
            onAssign={onAssign}
            people={people}
          />
        </>
      )}
    </div>
  )
}
