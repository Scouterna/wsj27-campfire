import { BackIcon, Button, Chip, unitName } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useId, useMemo, useState, type ReactElement } from "react"

import { canBeSharedWith, scopeOf, unitOfCase, whoSees, type Case } from "../../../model/Case"
import { capitalized, scopeName } from "../../../model/CaseType"
import { nameOf, placingLine, type People, type Person } from "../../../model/Person"
import { PersonMark } from "../../components/personmark/PersonMark"
import { PersonPicker } from "../../components/personpicker/PersonPicker"

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
 * What a person's row offers – taking the case back from someone it is shared with, or
 * sharing it with someone it is not.
 */
interface PersonAction {
  readonly kind: "add" | "remove"
  readonly onPress: () => void
}

interface PersonRowProps {
  /**
   * What the row offers, undefined for a reader who may not change who sees the case.
   */
  readonly action: PersonAction | undefined
  /**
   * Whether a write is under way, which holds the button still.
   */
  readonly isBusy: boolean
  /**
   * The person, by member number.
   */
  readonly memberNo: string
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * One person the case is or could be shared with: their mark, name, and where they belong,
 * and the way to change it where the reader may.
 * @param props The person, and what the row offers.
 * @returns The row.
 */
function PersonRow(props: PersonRowProps): ReactElement {
  const person = props.people?.get(props.memberNo)
  const name = nameOf(props.people, props.memberNo)
  const placing = placingLine(person, unitName)
  const isRemoval = props.action?.kind === "remove"

  return (
    <li className="access-card-person">
      <PersonMark name={name} person={person} />
      <span className="access-card-name">
        <strong>{name}</strong>
        {placing !== undefined && <small>{placing}</small>}
      </span>
      {props.action !== undefined && (
        <button
          aria-label={isRemoval ? `Ta bort ${name}` : `Dela med ${name}`}
          className={isRemoval ? "access-card-action access-card-remove" : "access-card-action"}
          disabled={props.isBusy}
          onClick={props.action.onPress}
          type="button"
        >
          {isRemoval ? "Ta bort" : "Dela"}
        </button>
      )}
    </li>
  )
}

/**
 * Who the case can be shared with, as the panel names them, matching who it may go to –
 * the leaders of its unit for a unit's case and a CMT case, CMT too for a private CMT
 * case, and leaders and CMT for a health case – always as people who do not see it, so
 * nobody offered looks as if they already did.
 * @param item The case.
 * @returns The words.
 */
function offeredName(item: Case): string {
  const type = scopeOf(item).type
  if (type === "hälsa") {
    return "Ledare och CMT som inte ser ärendet"
  }
  const unit = unitOfCase(item)
  const leaders = unit === undefined ? undefined : `ledare i avdelning ${String(unit)}`
  if (type === "cmt" && item.secrecyLevel === 5) {
    return leaders === undefined
      ? "CMT som inte ser ärendet"
      : `CMT och ${leaders} som inte ser ärendet`
  }
  return `${capitalized(leaders ?? "ledare")} som inte ser ärendet`
}

interface SharePanelProps {
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The case, which names who it can be shared with.
   */
  readonly item: Case
  /**
   * The people sharing would let in.
   */
  readonly offered: readonly Person[]
  /**
   * Shares the case with someone.
   */
  readonly onAdd: (person: Person | undefined) => void
  /**
   * Puts the panel away.
   */
  readonly onClose: () => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * Sharing the case, in a panel set into the card while it is open: what sharing gives,
 * then who it could let in, named for this case – as a list when they are few, and a
 * search when they are many – and the way to close it at its top.
 * @param props Who could be let in, and what adding and closing do.
 * @returns The panel.
 */
function SharePanel(props: SharePanelProps): ReactElement {
  const { offered } = props
  const id = useId()
  const isOffered = useMemo(() => {
    const offeredNos = new Set(offered.map((person) => person.memberNo))
    return (person: Person): boolean => offeredNos.has(person.memberNo)
  }, [offered])

  return (
    <div aria-labelledby={id} className="access-card-panel" role="group">
      <div className="access-card-panel-head">
        <strong id={id}>Dela ärendet</strong>
        <Button label="Klar" onPress={props.onClose} variant="plain" />
      </div>
      <p className="access-card-about">
        Den du delar med kan läsa och skriva i ärendet, men inte dela det vidare.
      </p>
      <p className="access-card-label" id={`${id}-offered`}>
        {offeredName(props.item)}
      </p>
      {offered.length === 0 && (
        <p className="access-card-about">Det finns ingen mer att dela ärendet med.</p>
      )}
      {offered.length > 0 && offered.length <= listedAtMost && (
        <ul aria-labelledby={`${id}-offered`} className="access-card-people">
          {offered.map((person) => (
            <PersonRow
              action={{
                kind: "add",
                onPress: () => {
                  props.onAdd(person)
                },
              }}
              isBusy={props.isBusy}
              key={person.memberNo}
              memberNo={person.memberNo}
              people={props.people}
            />
          ))}
        </ul>
      )}
      {offered.length > listedAtMost && (
        <PersonPicker
          isOffered={isOffered}
          labelId={`${id}-offered`}
          nobodyText="Ingen ledare eller i CMT som inte ser ärendet heter så."
          onPick={props.onAdd}
          picked={undefined}
        />
      )}
    </div>
  )
}

interface SharedListProps {
  /**
   * Whether the reader may take the case back from the people it is shared with.
   */
  readonly canShare: boolean
  /**
   * The id the list carries, which the toggle at the card's top right names as what it
   * opens.
   */
  readonly id: string
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * Who the case is shared with, by member number.
   */
  readonly memberNos: readonly string[]
  /**
   * Opens the panel that shares it with more, undefined where there is nobody more or the
   * reader may not.
   */
  readonly onMore: (() => void) | undefined
  /**
   * Takes the case back from someone.
   */
  readonly onRemove: (memberNo: string) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * Who else the case is shared with, beyond its role, opened from the count at the card's
 * top right: each person and, for a reader who may change it, the way to take the case
 * back from them, and under them the way to share it with more.
 * @param props The people, and what removing and sharing with more do.
 * @returns The list.
 */
function SharedList(props: SharedListProps): ReactElement {
  return (
    <div className="access-card-shares" id={props.id}>
      <ul aria-label="Också delat med" className="access-card-people">
        {props.memberNos.map((memberNo) => (
          <PersonRow
            action={
              props.canShare
                ? {
                    kind: "remove",
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
      {props.onMore !== undefined && (
        <Button label="Dela med fler" onPress={props.onMore} variant="plain" />
      )}
    </div>
  )
}

/**
 * Who sees the case, answered in one place where the reader writes in it, so a note is
 * never written without knowing who will read it: its kind and who its role reaches, and
 * at the top right whichever comes next – who else it is shared with, as a count that
 * opens the list, or for a case shared with nobody, the way to share it. Sharing opens as
 * a panel set into the card, and once someone is added, the list stands open, so they are
 * seen added.
 * @param props The case, the reader, the names, and what sharing does.
 * @returns The card.
 */
export function AccessCard(props: AccessCardProps): ReactElement {
  const { item, onShare, people, readerMemberNo } = props
  const id = useId()
  const [isSharing, setIsSharing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const shared = item.extraAccess
  // The people sharing would let in, alphabetically: not anyone it is shared with, its
  // creator, or the reader, and nobody the case may not go to.
  const offered = useMemo(() => {
    const taken = new Set([...shared, item.creatorMemberNo, readerMemberNo])
    return [...(people?.values() ?? [])]
      .filter((person) => !taken.has(person.memberNo) && canBeSharedWith(item, person))
      .toSorted((left, right) => swedish.compare(left.name, right.name))
  }, [item, people, readerMemberNo, shared])
  const isListed = offered.length <= listedAtMost
  const canShareMore = props.canShare && !isSharing && offered.length > 0
  const share = (): void => {
    setIsSharing(true)
  }

  const close = useCallback(() => {
    setIsSharing(false)
  }, [])

  // A search closes once someone is chosen, and a list stays open for the next, since its
  // people are all in view. Either way, who it is shared with opens to show them added.
  const add = useCallback(
    (person: Person | undefined): void => {
      if (person === undefined) {
        return
      }
      setIsOpen(true)
      onShare([...shared, person.memberNo], isListed ? undefined : close)
    },
    [close, isListed, onShare, shared],
  )

  const count = shared.length
  return (
    <section aria-label="Vem ser ärendet" className="card access-card">
      <div className="access-card-head">
        <Chip>{scopeName(scopeOf(item))}</Chip>
        <p className="access-card-who">{whoSees(item, readerMemberNo, people)}</p>
        {count > 0 && (
          <button
            aria-controls={`${id}-shares`}
            aria-expanded={isOpen}
            className="access-card-toggle"
            onClick={() => {
              setIsOpen(!isOpen)
            }}
            type="button"
          >
            Också delat med {count === 1 ? "1 person" : `${String(count)} personer`}
            <span aria-hidden="true" className="access-card-chevron">
              <BackIcon size={14} strokeWidth={2.4} />
            </span>
          </button>
        )}
        {count === 0 && canShareMore && <Button label="Dela" onPress={share} variant="plain" />}
      </div>
      {count > 0 && isOpen && (
        <SharedList
          canShare={props.canShare}
          id={`${id}-shares`}
          isBusy={props.isBusy}
          memberNos={shared}
          onMore={canShareMore ? share : undefined}
          onRemove={(memberNo) => {
            onShare(shared.filter((other) => other !== memberNo))
          }}
          people={people}
        />
      )}
      {props.canShare && isSharing && (
        <SharePanel
          isBusy={props.isBusy}
          item={item}
          offered={offered}
          onAdd={add}
          onClose={close}
          people={people}
        />
      )}
    </section>
  )
}
