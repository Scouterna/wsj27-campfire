import { Button, Chip, Count, HandIcon, ParticipantsIcon } from "@scouterna/wsj27-campfire-ui"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"

import {
  canBeSharedWith,
  holderCount,
  scopeOf,
  seenBy,
  shareAudiencesOf,
  sharedCount,
  unitsOfCase,
  type Case,
} from "../../../model/Case"
import { capitalized, scopeBadge } from "../../../model/CaseType"
import { nameOf, type People, type Person } from "../../../model/Person"
import { PersonMark } from "../../components/personmark/PersonMark"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { PersonRow } from "../../components/personrow/PersonRow"
import { useOwnUnit } from "../../use-people"
import { AssignPanel } from "./AssignPanel"

import "./AccessCard.css"

// Constructed once, because a collator is expensive to build and every person offered is
// sorted with it.
const swedish = new Intl.Collator("sv")

/**
 * The most people offered as a list to share with rather than through a search – a
 * leader's handful of fellow leaders, where typing a name would be slower than reading it.
 */
const listedAtMost = 6

/**
 * The case, its names, what the reader may do about who sees it, and what doing it calls.
 */
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
 * Unit numbers joined as a sentence lists them – "2, 7 och 12".
 */
const unitList = new Intl.ListFormat("sv", { type: "conjunction" })

/**
 * The panel open under the summary – who sees the case, or who could be responsible.
 */
type Panel = "access" | "assign"

/**
 * Who is responsible, whether that can change, the panel's state, and what the buttons
 * do.
 */
interface ResponsibleProps {
  /**
   * Whether the reader may change who is responsible.
   */
  readonly canAssign: boolean
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * Whether the choice of who is responsible is open under the summary.
   */
  readonly isChoosing: boolean
  /**
   * Who is responsible, by member number, undefined while nobody is.
   */
  readonly memberNo: string | undefined
  /**
   * Opens or closes the choice of who is responsible.
   */
  readonly onChoose: () => void
  /**
   * Makes the reader responsible.
   */
  readonly onTake: () => void
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
 * Who is responsible for following the case up, the first half of the summary: their mark
 * and name, which open the choice of someone else where the reader may make one – and
 * while nobody is, an empty mark and the way to take it on.
 * @param props Who is responsible, and what the buttons do.
 * @returns The half, under its label.
 */
function Responsible(props: ResponsibleProps): ReactElement {
  const { memberNo, people } = props
  const person = memberNo === undefined ? undefined : people?.get(memberNo)
  const name = memberNo === undefined ? "Ingen" : nameOf(people, memberNo)
  const shown = memberNo !== undefined && memberNo === props.readerMemberNo ? `${name} (du)` : name
  const mark =
    memberNo === undefined ? (
      <span aria-hidden="true" className="access-card-nobody" />
    ) : (
      <PersonMark name={name} person={person} />
    )

  const id = useId()
  return (
    <div aria-labelledby={id} className="access-card-part" role="group">
      <p className="access-card-label" id={id}>
        Ansvarig
      </p>
      <div className="access-card-value">
        {props.canAssign ? (
          <Button
            icon={mark}
            isExpanded={props.isChoosing}
            label={shown}
            onPress={props.onChoose}
            variant="plain"
          />
        ) : (
          <span className="access-card-person">
            {mark}
            {shown}
          </span>
        )}
        {props.canAssign && memberNo === undefined && props.readerMemberNo !== undefined && (
          <Button
            disabled={props.isBusy}
            icon={<HandIcon size={18} />}
            label="Jag tar det"
            onPress={props.onTake}
            variant="secondary"
          />
        )}
      </div>
    </div>
  )
}

/**
 * The case, the reader, the names, and the control at the half's end.
 */
interface SeesProps {
  /**
   * The control that opens who sees the case, at the half's end, undefined where there is
   * nothing to open.
   */
  readonly action: ReactNode
  /**
   * The case.
   */
  readonly item: Case
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number.
   */
  readonly readerMemberNo: string | undefined
}

/**
 * Who sees the case, the second half of the summary: its kind, who its level lets in, and
 * how many it is shared with besides, as a small count – and at its end the way to
 * see or change all of it, which stays beside them where the halves stack.
 * @param props The case, the reader, the names, and the control.
 * @returns The half, under its label.
 */
function Sees(props: SeesProps): ReactElement {
  const { item, people } = props
  const ownUnit = useOwnUnit()
  const badge = scopeBadge(scopeOf(item), ownUnit)
  const count = sharedCount(item.extraAccess, people)
  const id = useId()

  return (
    <div className="access-card-sees">
      <div aria-labelledby={id} className="access-card-part" role="group">
        <p className="access-card-label" id={id}>
          Ser ärendet
        </p>
        <div className="access-card-value">
          {badge !== undefined && <Chip>{badge}</Chip>}
          <span>{seenBy(item, props.readerMemberNo, people, ownUnit)}</span>
          {count !== undefined && <Count said={` och ${count}`}>+{item.extraAccess.length}</Count>}
        </div>
      </div>
      {props.action}
    </div>
  )
}

/**
 * Who the case can be shared with, as the panel names them, matching who it may go to –
 * always as people who do not see it, so nobody offered looks as if they already did.
 * @param item The case to be shared.
 * @param people Everyone the module knows, which places the people the case is about.
 * @param ownUnit The one unit the reader leads, which the words do not name.
 * @returns The words – "Ledare och CMT som inte ser ärendet" – or undefined where nobody
 * can be named, since the units the case is about are not known.
 */
function offeredName(
  item: Case,
  people: People | undefined,
  ownUnit: number | undefined,
): string | undefined {
  const units = unitsOfCase(item, people)
  const named = shareAudiencesOf(item).flatMap((audience) => {
    if (audience === "cmt") {
      return ["CMT"]
    }
    if (audience === "leaders") {
      return ["ledare"]
    }
    if (units.length === 0) {
      return []
    }
    if (units.length === 1 && units[0] === ownUnit) {
      return ["ledare i avdelningen"]
    }
    const listed = unitList.format(units.map(String))
    return [`ledare i ${units.length === 1 ? "avdelning" : "avdelningarna"} ${listed}`]
  })
  if (named.length === 0) {
    return undefined
  }
  return `${capitalized(named.join(" och "))} som inte ser ärendet`
}

/**
 * What the level means, at the foot of who sees the case – what it lets in beyond the rows
 * above, that it was chosen when the case was opened, and what sharing gives to whoever
 * shares or is shared with.
 * @param item The case.
 * @param readerMemberNo The reader's own member number.
 * @param canShare Whether the reader may share the case.
 * @returns The sentences.
 */
function accessNote(item: Case, readerMemberNo: string | undefined, canShare: boolean): string {
  if (readerMemberNo !== undefined && item.extraAccess.includes(readerMemberNo)) {
    return "Ärendet är delat med dig. Du kan läsa och skriva i det, men inte dela det vidare."
  }
  if (item.secrecyLevel === 4) {
    return "Ärendet kan aldrig delas med någon annan. Det valdes när ärendet skapades."
  }
  const gives = canShare
    ? " De du delar med kan läsa och skriva i det, men inte dela det vidare."
    : ""
  if (item.secrecyLevel === 5) {
    return `Bara de som står här ser ärendet.${gives}`
  }
  return `Vem som ser ärendet valdes när det skapades och går inte att ändra.${gives}`
}

/**
 * The lists in the panel whose rows carry a button a write takes away.
 */
type PanelRows = "offered" | "shared"

/**
 * The selector for the buttons of one of the panel's lists, in order.
 * @param rows The list.
 * @returns The selector, from the panel's root.
 */
function buttonsOf(rows: PanelRows): string {
  return rows === "shared"
    ? '[data-rows="shared"] .case-person-row-action'
    : '[data-rows="offered"] .case-person-row-action'
}

/**
 * Where focus goes once a write has taken away the row it was on: to the row that took its
 * place, else the first of the other list, else the button that opened the panel – rather
 * than falling to the page. A refused write leaves the button where it was, and focus with
 * it. A press is remembered with what held focus, so a tap that focused nothing moves
 * nothing.
 * @param isBusy Whether a write is under way, whose end is when the row may be gone.
 * @returns The panel's root to attach, and the way to remember a press.
 */
function useFocusAfterWrite(isBusy: boolean): {
  readonly remember: (list: PanelRows, index: number) => void
  readonly root: RefObject<HTMLDivElement | null>
} {
  const root = useRef<HTMLDivElement>(null)
  const pressed = useRef<
    { readonly button: Element; readonly index: number; readonly list: PanelRows } | undefined
  >(undefined)
  const remember = useCallback((list: PanelRows, index: number): void => {
    const { activeElement } = document
    pressed.current = activeElement === null ? undefined : { button: activeElement, index, list }
  }, [])
  useEffect(() => {
    if (isBusy || pressed.current === undefined) {
      return
    }
    const { button, index, list } = pressed.current
    pressed.current = undefined
    if (button.isConnected) {
      return
    }
    const buttonsIn = (rows: PanelRows): readonly HTMLButtonElement[] => [
      ...(root.current?.querySelectorAll<HTMLButtonElement>(buttonsOf(rows)) ?? []),
    ]
    const own = buttonsIn(list)
    const next =
      own.at(Math.min(index, own.length - 1)) ??
      (list === "shared" ? buttonsIn("offered")[0] : undefined) ??
      root.current
        ?.closest(".access-card")
        ?.querySelector<HTMLButtonElement>("button[aria-expanded]")
    next?.focus()
  }, [isBusy])
  return { remember, root }
}

/**
 * Who sees the case and what each of them is to it, the reader, the names, and what
 * sharing and removing do.
 */
interface AccessPanelProps {
  /**
   * Whether the reader may change who the case is shared with.
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
   * The people sharing would let in.
   */
  readonly offered: readonly Person[]
  /**
   * Shares the case with someone more.
   */
  readonly onAdd: (person: Person) => void
  /**
   * Takes the case back from someone.
   */
  readonly onRemove: (memberNo: string) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number.
   */
  readonly readerMemberNo: string | undefined
}

/**
 * The people sharing would let in, and what sharing with one does.
 */
interface OfferedProps {
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The id of the label the list or search is named by.
   */
  readonly labelId: string
  /**
   * The people sharing would let in.
   */
  readonly offered: readonly Person[]
  /**
   * Shares the case with one of them, given with their place in the list, so focus can move
   * on once the row is gone.
   */
  readonly onAdd: (person: Person, index: number) => void
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
        isBusy={props.isBusy}
        isOffered={isOffered}
        labelId={props.labelId}
        nobodyText="Ingen ledare eller i CMT som inte ser ärendet heter så."
        onPick={(person) => {
          props.onAdd(person, -1)
        }}
      />
    )
  }
  return (
    <ul aria-labelledby={props.labelId} className="case-person-rows" data-rows="offered">
      {offered.map((person, index) => (
        <PersonRow
          action={{
            label: "Dela",
            onPress: () => {
              props.onAdd(person, index)
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
 * The marker at a row's end saying the person is responsible for the case.
 * @param isResponsible Whether they are.
 * @returns The marker, or nothing.
 */
function responsibleMark(isResponsible: boolean): ReactElement | undefined {
  return isResponsible ? <span className="access-card-role">Ansvarig</span> : undefined
}

/**
 * Who sees the case, in a panel set into the card under its summary: whoever is
 * responsible, the group its level lets in and how many that is – or, on a private case,
 * its creator – and each person it is shared with, with the way to take it back from
 * them; then, for a reader who may share, the people it could let in, named for this
 * case; and last what the level means.
 * @param props Who sees the case, and what sharing and removing do.
 * @returns The panel.
 */
function AccessPanel(props: AccessPanelProps): ReactElement {
  const { item, offered, people, readerMemberNo } = props
  const id = useId()
  const ownUnit = useOwnUnit()
  const shared = item.extraAccess
  const assignee = item.assigneeMemberNo
  const isPrivate = item.secrecyLevel === 5
  const named = isPrivate ? [item.creatorMemberNo, ...shared] : shared
  const isAssigneeNamed = assignee !== undefined && named.includes(assignee)
  const holders = holderCount(item, people)
  const offeredLabel = offeredName(item, people, ownUnit)
  const { remember, root } = useFocusAfterWrite(props.isBusy)

  return (
    <div aria-label="Vem ser ärendet" className="access-card-panel" ref={root} role="group">
      <ul aria-label="De som ser ärendet" className="case-person-rows" data-rows="shared">
        {assignee !== undefined && !isAssigneeNamed && (
          <PersonRow
            action={undefined}
            isBusy={props.isBusy}
            memberNo={assignee}
            people={people}
            readerMemberNo={readerMemberNo}
            trailing={responsibleMark(true)}
          />
        )}
        {isPrivate ? (
          <PersonRow
            action={undefined}
            isBusy={props.isBusy}
            memberNo={item.creatorMemberNo}
            people={people}
            readerMemberNo={readerMemberNo}
            trailing={responsibleMark(assignee === item.creatorMemberNo)}
          />
        ) : (
          <li className="case-person-row">
            <span aria-hidden="true" className="access-card-group">
              <ParticipantsIcon size={20} />
            </span>
            <span className="case-person-row-name">
              <strong>{seenBy(item, readerMemberNo, people, ownUnit)}</strong>
              {holders !== undefined && (
                <small>{holders === 1 ? "1 person" : `${String(holders)} personer`}</small>
              )}
            </span>
          </li>
        )}
        {shared.map((memberNo, index) => (
          <PersonRow
            action={
              props.canShare
                ? {
                    isTaking: true,
                    label: "Ta bort",
                    onPress: () => {
                      remember("shared", index)
                      props.onRemove(memberNo)
                    },
                  }
                : undefined
            }
            isBusy={props.isBusy}
            key={memberNo}
            memberNo={memberNo}
            people={people}
            readerMemberNo={readerMemberNo}
            trailing={responsibleMark(assignee === memberNo)}
          />
        ))}
      </ul>
      {props.canShare && offeredLabel !== undefined && (
        <p className="access-card-label" id={`${id}-offered`}>
          {offeredLabel}
        </p>
      )}
      {props.canShare && offered.length === 0 && (
        <p className="access-card-about">Det finns ingen mer att dela ärendet med.</p>
      )}
      {props.canShare && offered.length > 0 && (
        <Offered
          isBusy={props.isBusy}
          labelId={`${id}-offered`}
          offered={offered}
          onAdd={(person, index) => {
            // A search keeps its own focus, so only a listed row is remembered.
            if (index >= 0) {
              remember("offered", index)
            }
            props.onAdd(person)
          }}
          people={people}
        />
      )}
      <p className="access-card-note">{accessNote(item, readerMemberNo, props.canShare)}</p>
    </div>
  )
}

/**
 * The people sharing would let in, alphabetically: not anyone it is shared with, its
 * creator, or the reader, and nobody the case may not go to.
 * @param item The case to be shared.
 * @param people Everyone the module knows, undefined while the names are loading.
 * @param readerMemberNo The reader, who is never offered to themselves.
 * @returns The people, none while the names are loading.
 */
function useOffered(
  item: Case,
  people: People | undefined,
  readerMemberNo: string | undefined,
): readonly Person[] {
  return useMemo(() => {
    const taken = new Set([...item.extraAccess, item.creatorMemberNo, readerMemberNo])
    return [...(people?.values() ?? [])]
      .filter((person) => !taken.has(person.memberNo) && canBeSharedWith(item, person, people))
      .toSorted((left, right) => swedish.compare(left.name, right.name))
  }, [item, people, readerMemberNo])
}

/**
 * What the summary's button says, if anything: sharing a case shared with nobody yet,
 * managing one that is, and only seeing who has one a reader cannot share – or a case that
 * can never be shared, whose panel says why.
 * @param item The case.
 * @param canShare Whether the reader may share it.
 * @param isOffering Whether there is anyone to share it with.
 * @returns The words, or undefined where the panel would hold nothing the summary does not.
 */
function seesAction(item: Case, canShare: boolean, isOffering: boolean): string | undefined {
  const isShared = item.extraAccess.length > 0
  if (canShare) {
    if (isShared) {
      return "Hantera"
    }
    return isOffering ? "Dela" : undefined
  }
  return isShared || item.secrecyLevel === 4 ? "Visa" : undefined
}

/**
 * Who follows the case up and who sees it, answered in one place where the reader writes
 * in it, so a note is never written without knowing who will read it: a summary of the two
 * side by side – stacked where the card is narrow – each opening a panel set into the card
 * under it, one at a time, from the control that opened it.
 * @param props The case, the reader, the names, and what sharing and assigning do.
 * @returns The card.
 */
export function AccessCard(props: AccessCardProps): ReactElement {
  const { item, onShare, people, readerMemberNo } = props
  const [panel, setPanel] = useState<Panel | undefined>(undefined)
  const shared = item.extraAccess
  const offered = useOffered(item, people, readerMemberNo)
  const toggle = (which: Panel): void => {
    setPanel(panel === which ? undefined : which)
  }
  const close = useCallback(() => {
    setPanel(undefined)
  }, [])
  const action = seesAction(item, props.canShare, offered.length > 0)
  // The last person taken back from a case with nobody left to offer leaves nothing to
  // open the panel from, so the panel goes with the button.
  const isAccessOpen = panel === "access" && action !== undefined

  return (
    <section aria-label="Ansvarig och vem som ser ärendet" className="card access-card">
      <div className="access-card-summary">
        <Responsible
          canAssign={props.canAssign}
          isBusy={props.isBusy}
          isChoosing={panel === "assign"}
          memberNo={item.assigneeMemberNo}
          onChoose={() => {
            toggle("assign")
          }}
          onTake={() => {
            props.onAssign(readerMemberNo)
          }}
          people={people}
          readerMemberNo={readerMemberNo}
        />
        <span aria-hidden="true" className="access-card-rule" />
        <Sees
          action={
            action === undefined ? undefined : (
              <Button
                isExpanded={isAccessOpen}
                label={action}
                onPress={() => {
                  toggle("access")
                }}
                variant="secondary"
              />
            )
          }
          item={item}
          people={people}
          readerMemberNo={readerMemberNo}
        />
      </div>
      {isAccessOpen && (
        <AccessPanel
          canShare={props.canShare}
          isBusy={props.isBusy}
          item={item}
          offered={offered}
          onAdd={(person) => {
            // The people offered hold still while any write is under way, so the list sent
            // here is always built from a settled one. The panel stays open, so the person
            // just added appears among those who see the case.
            onShare([...shared, person.memberNo])
          }}
          onRemove={(memberNo) => {
            onShare(shared.filter((other) => other !== memberNo))
          }}
          people={people}
          readerMemberNo={readerMemberNo}
        />
      )}
      {props.canAssign && panel === "assign" && (
        <AssignPanel
          assigneeMemberNo={item.assigneeMemberNo}
          caseId={item.id}
          isBusy={props.isBusy}
          onAssign={(memberNo) => {
            // Choosing someone puts the panel away; taking the case off someone leaves it
            // open, since the next thing is usually to choose who takes it on instead.
            props.onAssign(memberNo, memberNo === undefined ? undefined : close)
          }}
          people={people}
          readerMemberNo={readerMemberNo}
        />
      )}
    </section>
  )
}
