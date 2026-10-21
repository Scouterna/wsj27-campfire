import { Button, Chip } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useId, useMemo, useState, type ReactElement } from "react"

import {
  canBeSharedWith,
  scopeOf,
  shareAudiencesOf,
  unitOfCase,
  whoSees,
  type Case,
} from "../../../model/Case"
import { capitalized, scopeName } from "../../../model/CaseType"
import type { People, Person } from "../../../model/Person"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { AssigneeLine, AssignPanel } from "./AssignPanel"
import { PersonRow } from "./PersonRow"

import "./AccessCard.css"

// Constructed once, because a collator is expensive to build and every person offered is
// sorted with it.
const swedish = new Intl.Collator("sv")

/**
 * The most people offered as a list to share with rather than through a search – a
 * leader's handful of fellow leaders, where typing a name would be slower than reading it.
 */
const listedAtMost = 6

export interface AccessCardProps {
  /**
   * Whether the reader may change who is responsible for the case – anyone who can open
   * it, while it is open.
   */
  readonly canAssign: boolean
  /**
   * Whether the reader may change who the case is shared with, so each person carries a
   * way to remove them and the card a way to add more.
   */
  readonly canShare: boolean
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The case.
   */
  readonly item: Case
  /**
   * Makes someone responsible for the case, or nobody, then calls `onAssigned` when there
   * is one.
   */
  readonly onAssign: (memberNo: string | undefined, onAssigned?: () => void) => void
  /**
   * Shares the case with exactly these people, then calls `onShared` when there is one.
   */
  readonly onShare: (memberNos: readonly string[], onShared?: () => void) => void
  /**
   * Everyone the module knows, undefined while the names are loading – a private case
   * names its creator, and a shared one the people it is shared with.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number, so a private case of theirs says so to them and they
   * are never offered to themselves.
   */
  readonly readerMemberNo: string | undefined
}

/**
 * Who the case can be shared with, as the panel names them, matching who it may go to –
 * always as people who do not see it, so nobody offered looks as if they already did.
 * @param item The case.
 * @returns The words – "Ledare och CMT som inte ser ärendet".
 */
function offeredName(item: Case): string {
  const unit = unitOfCase(item)
  const named = shareAudiencesOf(item).flatMap((audience) => {
    if (audience === "cmt") {
      return ["CMT"]
    }
    if (audience === "leaders") {
      return ["ledare"]
    }
    return unit === undefined ? [] : [`ledare i avdelning ${String(unit)}`]
  })
  return `${capitalized(named.join(" och "))} som inte ser ärendet`
}

interface SharePanelProps {
  /**
   * Whether the reader may change who the case is shared with.
   */
  readonly canShare: boolean
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The case, which names who it is and can be shared with.
   */
  readonly item: Case
  /**
   * The people sharing would let in.
   */
  readonly offered: readonly Person[]
  /**
   * Shares the case with someone more.
   */
  readonly onAdd: (person: Person | undefined) => void
  /**
   * Takes the case back from someone.
   */
  readonly onRemove: (memberNo: string) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

interface OfferedProps {
  /**
   * The id of the label the list or search is named by.
   */
  readonly labelId: string
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The people sharing would let in.
   */
  readonly offered: readonly Person[]
  /**
   * Shares the case with one of them.
   */
  readonly onAdd: (person: Person | undefined) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * The people the case could be shared with – as a list when they are few, and a search
 * when they are many.
 * @param props The people, and what sharing with one does.
 * @returns The list or the search.
 */
function Offered(props: OfferedProps): ReactElement {
  const { offered } = props
  const isOffered = useMemo(() => {
    const offeredNos = new Set(offered.map((person) => person.memberNo))
    return (person: Person): boolean => offeredNos.has(person.memberNo)
  }, [offered])

  if (offered.length > listedAtMost) {
    return (
      <PersonPicker
        isOffered={isOffered}
        labelId={props.labelId}
        nobodyText="Ingen ledare eller i CMT som inte ser ärendet heter så."
        onPick={props.onAdd}
        picked={undefined}
      />
    )
  }
  return (
    <ul aria-labelledby={props.labelId} className="access-card-people">
      {offered.map((person) => (
        <PersonRow
          action={{
            label: "Dela",
            onPress: () => {
              props.onAdd(person)
            },
            spoken: "Dela med",
          }}
          isBusy={props.isBusy}
          key={person.memberNo}
          memberNo={person.memberNo}
          people={props.people}
        />
      ))}
    </ul>
  )
}

/**
 * Who the case is shared with and who it could be, in a panel set into the card under the
 * button that opened it: each person it is shared with, with the way to take it back from
 * them, then – for a reader who may share – what sharing gives and the people it could let
 * in, named for this case.
 * @param props Who it is and could be shared with, and what sharing and removing do.
 * @returns The panel.
 */
function SharePanel(props: SharePanelProps): ReactElement {
  const { item, offered } = props
  const id = useId()
  const shared = item.extraAccess

  return (
    <div aria-label="Dela ärendet" className="access-card-panel" role="group">
      {shared.length > 0 && (
        <>
          <p className="access-card-label" id={`${id}-shared`}>
            Delat med
          </p>
          <ul aria-labelledby={`${id}-shared`} className="access-card-people">
            {shared.map((memberNo) => (
              <PersonRow
                action={
                  props.canShare
                    ? {
                        isTaking: true,
                        label: "Ta bort",
                        onPress: () => {
                          props.onRemove(memberNo)
                        },
                      }
                    : undefined
                }
                isBusy={props.isBusy}
                key={memberNo}
                memberNo={memberNo}
                people={props.people}
              />
            ))}
          </ul>
        </>
      )}
      {props.canShare && (
        <>
          <p className="access-card-about">
            Den du delar med kan läsa och skriva i ärendet, men inte dela det vidare.
          </p>
          <p className="access-card-label" id={`${id}-offered`}>
            {offeredName(item)}
          </p>
          {offered.length === 0 ? (
            <p className="access-card-about">Det finns ingen mer att dela ärendet med.</p>
          ) : (
            <Offered
              isBusy={props.isBusy}
              labelId={`${id}-offered`}
              offered={offered}
              onAdd={props.onAdd}
              people={props.people}
            />
          )}
        </>
      )}
    </div>
  )
}

/**
 * The people sharing would let in, alphabetically: not anyone it is shared with, its
 * creator, or the reader, and nobody the case may not go to.
 * @param item The case.
 * @param people Everyone the module knows, undefined while the names are loading.
 * @param readerMemberNo The reader, who is never offered to themselves.
 * @returns The people.
 */
function useOffered(
  item: Case,
  people: People | undefined,
  readerMemberNo: string | undefined,
): readonly Person[] {
  return useMemo(() => {
    const taken = new Set([...item.extraAccess, item.creatorMemberNo, readerMemberNo])
    return [...(people?.values() ?? [])]
      .filter((person) => !taken.has(person.memberNo) && canBeSharedWith(item, person))
      .toSorted((left, right) => swedish.compare(left.name, right.name))
  }, [item, people, readerMemberNo])
}

/**
 * Who sees the case and who follows it up, answered in one place where the reader writes
 * in it, so a note is never written without knowing who will read it: its kind and who its
 * role reaches, with its actions at the end of that line, where they never move – taking
 * the case on, choosing who is responsible, and sharing at the very edge, the last two
 * each opening a panel, so taking it on can leave without shifting anything – and who is
 * responsible in a quiet line under it. A panel opens
 * under the row from the button that opened it and closes from the same button, one at a
 * time.
 * @param props The case, the reader, the names, and what sharing and assigning do.
 * @returns The card.
 */
export function AccessCard(props: AccessCardProps): ReactElement {
  const { item, onShare, people, readerMemberNo } = props
  const [panel, setPanel] = useState<"assign" | "share" | undefined>(undefined)
  const shared = item.extraAccess
  const offered = useOffered(item, people, readerMemberNo)
  const assignee = item.assigneeMemberNo
  const toggle = (which: "assign" | "share"): void => {
    setPanel(panel === which ? undefined : which)
  }
  const close = useCallback(() => {
    setPanel(undefined)
  }, [])

  const count = shared.length
  const isShareShown = count > 0 || (props.canShare && offered.length > 0)
  const canTakeIt = props.canAssign && readerMemberNo !== undefined && assignee !== readerMemberNo
  return (
    <section aria-label="Vem ser ärendet" className="card access-card">
      <div className="access-card-head">
        <Chip>{scopeName(scopeOf(item))}</Chip>
        <p className="access-card-who">{whoSees(item, readerMemberNo, people)}</p>
        {(isShareShown || props.canAssign) && (
          <span className="access-card-actions">
            {canTakeIt && (
              <Button
                disabled={props.isBusy}
                label="Tilldela mig"
                onPress={() => {
                  props.onAssign(readerMemberNo)
                }}
                variant="secondary"
              />
            )}
            {props.canAssign && (
              <Button
                isExpanded={panel === "assign"}
                label="Tilldela"
                onPress={() => {
                  toggle("assign")
                }}
                variant="secondary"
              />
            )}
            {isShareShown && (
              <Button
                isExpanded={panel === "share"}
                label={count > 0 ? `Delat med ${String(count)}` : "Dela"}
                onPress={() => {
                  toggle("share")
                }}
                variant="secondary"
              />
            )}
          </span>
        )}
      </div>
      <AssigneeLine
        canAssign={props.canAssign}
        memberNo={assignee}
        people={people}
        readerMemberNo={readerMemberNo}
      />
      {panel === "share" && (
        <SharePanel
          canShare={props.canShare}
          isBusy={props.isBusy}
          item={item}
          offered={offered}
          onAdd={(person) => {
            // A search has done its job once someone is chosen, and a list stays open for
            // the next, since its people are all in view.
            if (person !== undefined) {
              onShare(
                [...shared, person.memberNo],
                offered.length > listedAtMost ? close : undefined,
              )
            }
          }}
          onRemove={(memberNo) => {
            onShare(shared.filter((other) => other !== memberNo))
          }}
          people={people}
        />
      )}
      {props.canAssign && panel === "assign" && (
        <AssignPanel
          assigneeMemberNo={assignee}
          caseId={item.id}
          isBusy={props.isBusy}
          onAssign={(memberNo) => {
            props.onAssign(memberNo, close)
          }}
          people={people}
          readerMemberNo={readerMemberNo}
        />
      )}
    </section>
  )
}
