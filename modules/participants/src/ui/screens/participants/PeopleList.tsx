import { Row, UnitAvatar, useUnitIdentities } from "@scouterna/wsj27-campfire-ui"
import { useVirtualizer, useWindowVirtualizer, type Virtualizer } from "@tanstack/react-virtual"
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react"

import { avatarNumberFor, fullName, type Participant } from "../../../model/Participant"
import { roleName } from "../../../model/ParticipantRole"
import { funktionName } from "../../../model/Participation"
import { PersonBadge } from "../../components/badge/PersonBadge"

import "./PeopleList.css"

/**
 * The design's row height at the default text size – the virtualizer's first guess,
 * corrected by measuring each row it renders, because rem-based type makes a row as tall
 * as the reader's Dynamic Type setting says.
 */
const estimatedRowHeight = 72

/**
 * Rows rendered beyond the viewport on each side, so a flick does not outrun the list.
 */
const overscan = 8

/**
 * The line under a name: the role first, then what places the person. A deltagare or a
 * ledare is placed by their unit – with its name joined on when the identities know it –
 * the management by their funktion where the roster details one, and the IST by the one
 * word alone, since the participants service does not carry their patrols.
 * @param person The row's person.
 * @param nameOf What a unit is called, from the unit identities.
 * @returns The row's detail line.
 */
function rowDetail(
  person: Participant,
  nameOf: (unitNumber: number) => string | undefined,
): string {
  const role = roleName(person.role)
  if (person.role === "kontingentledning") {
    return person.funktion === undefined ? role : `${role} · ${funktionName(person.funktion)}`
  }
  if (person.unitNumber === undefined) {
    return role
  }
  const unitName = nameOf(person.unitNumber)
  const unit = `Avdelning ${String(person.unitNumber)}`
  return unitName === undefined ? `${role} · ${unit}` : `${role} · ${unit} · ${unitName}`
}

/**
 * The person a `PersonRow` opens onto.
 */
export interface PersonRowProps {
  /**
   * The person the row names and links to. Compared by identity, so a row whose
   * person is unchanged skips rendering.
   */
  readonly person: Participant
}

/**
 * One row – a doorway into the person. Memoized on the person, because narrowing the
 * list re-renders it with most of its rows unchanged, and a row that stays needs no
 * work.
 */
export const PersonRow = memo(function PersonRow(props: PersonRowProps): ReactElement {
  const { person } = props
  const identities = useUnitIdentities()
  const detail = rowDetail(person, identities.name)
  const avatarNumber = avatarNumberFor(person)

  return (
    <Row
      leading={
        avatarNumber === undefined ? (
          <PersonBadge firstName={person.firstName} lastName={person.lastName} size="row" />
        ) : (
          <UnitAvatar isLeader={person.role === "ledare"} unitNumber={avatarNumber} />
        )
      }
      link={{ to: "/participants/$memberNo", params: { memberNo: person.memberNo } }}
    >
      <strong>
        {fullName(person)}
        {person.isFunktionsansvarig === true && <span className="person-fa">FA</span>}
      </strong>
      <small>{detail}</small>
    </Row>
  )
})

/**
 * The element whose scrolling moves `node`, or undefined when the document itself
 * scrolls. The browser chrome scrolls its content column; the shell chrome and Storybook
 * scroll the document – and a virtualizer has to watch the right one.
 * @param node The list, once it is in the document.
 * @returns The scrolling ancestor, or undefined when the document scrolls.
 */
function scrollParentOf(node: HTMLElement): HTMLElement | undefined {
  for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent
    }
  }
  return undefined
}

/**
 * How far the list's top sits from its scroll parent's top at scroll position zero –
 * everything above the list, the title and the search and the chips, that the
 * virtualizer must count before its first row.
 * @param node The list, once it is in the document.
 * @param scrollParent What scrolls it, or undefined when the document does.
 * @returns The offset, in pixels.
 */
function offsetWithin(node: HTMLElement, scrollParent: HTMLElement | undefined): number {
  const top = node.getBoundingClientRect().top
  return scrollParent === undefined
    ? top + scrollY
    : top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop
}

/**
 * What both variants below hand the rows: the people, where the list sits, and the
 * virtualizer watching whatever scrolls it.
 */
interface RowsProps {
  readonly listRef: RefObject<HTMLDivElement | null>
  readonly onFirstVisibleChange?: ((index: number) => void) | undefined
  readonly people: readonly Participant[]
  readonly registerJump?: ((jump: (index: number) => void) => void) | undefined
  readonly resetKey: string
  readonly scrollMargin: number
  readonly virtualizer:
    Virtualizer<HTMLElement, HTMLDivElement> | Virtualizer<Window, HTMLDivElement>
}

/**
 * The rows the virtualizer says exist, placed where it says. Shared by the variants
 * below, which differ only in the hook that made the virtualizer.
 * @param props The people, where the list sits, and the virtualizer placing the rows.
 * @returns The sizing container, and the rows inside it.
 */
function Rows(props: RowsProps): ReactElement {
  const { listRef, onFirstVisibleChange, people, registerJump, resetKey, scrollMargin } = props
  const { virtualizer } = props

  // The caller's way to a row that has no DOM yet, which works because the virtualizer
  // knows every row's place and the rows follow the scroll. A negative row means the very
  // top, above the rows. A near jump glides so the movement reads as movement, and a far
  // one lands instantly, because the virtualizer cannot measure ahead of a smooth scroll
  // across unmeasured rows, and the reader is told nothing by a blur.
  useEffect(() => {
    registerJump?.((index) => {
      const offset = virtualizer.scrollOffset ?? 0
      const target = index < 0 ? 0 : (virtualizer.getOffsetForIndex(index, "start")?.[0] ?? 0)
      const isNear = Math.abs(offset - target) < 1600
      const behavior =
        isNear && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto"
      if (index < 0) {
        virtualizer.scrollToOffset(0, { behavior })
      } else {
        virtualizer.scrollToIndex(index, { align: "start", behavior })
      }
    })
  }, [registerJump, virtualizer])

  // The topmost row actually in the viewport – the range, not the overscan – or a
  // negative row while everything above the rows is still in view, so the caller can
  // say where in the list the reader is.
  const firstVisible =
    (virtualizer.scrollOffset ?? 0) < scrollMargin ? -1 : (virtualizer.range?.startIndex ?? 0)
  useEffect(() => {
    onFirstVisibleChange?.(firstVisible)
  }, [firstVisible, onFirstVisibleChange])

  // A reader deep in the list who narrows it would otherwise land past its new end, so a
  // change of narrowing starts them over at the top – only when they had scrolled past
  // the controls they just used. A layout effect, so it lands in the same flushed update.
  // Never on mount, because mounting is not a narrowing, and a history pop remounts the
  // list exactly when the chrome has just restored the reader's scroll position.
  const mountedResetKey = useRef(resetKey)
  useLayoutEffect(() => {
    if (mountedResetKey.current === resetKey) {
      return
    }
    mountedResetKey.current = resetKey
    if ((virtualizer.scrollOffset ?? 0) > scrollMargin) {
      // Instant rather than smooth, because this is a correction the reader did not ask
      // for, and animating it is motion nobody requested.
      virtualizer.scrollToOffset(0, { behavior: "auto" })
    }
    // The narrowing is the trigger; the offset and the margin are read, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [resetKey])

  return (
    <div
      // The list is one list however few of its rows exist, so it says so – and its rows
      // carry their real position and count, because the DOM holds only the visible ones
      // and a screen reader would otherwise announce a list of just those.
      aria-label="Deltagare"
      className="people-list"
      ref={listRef}
      role="list"
      style={{ height: `${String(virtualizer.getTotalSize())}px` }}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const person = people[item.index]
        return person === undefined ? null : (
          <div
            aria-posinset={item.index + 1}
            aria-setsize={people.length}
            className="people-row"
            data-index={item.index}
            key={person.memberNo}
            ref={virtualizer.measureElement}
            role="listitem"
            style={{ transform: `translateY(${String(item.start - scrollMargin)}px)` }}
          >
            <PersonRow person={person} />
          </div>
        )
      })}
    </div>
  )
}

/**
 * What a variant needs to build its virtualizer and hand the rows on.
 */
interface VariantProps {
  readonly listRef: RefObject<HTMLDivElement | null>
  readonly onFirstVisibleChange?: ((index: number) => void) | undefined
  readonly people: readonly Participant[]
  readonly registerJump?: ((jump: (index: number) => void) => void) | undefined
  readonly resetKey: string
  readonly scrollMargin: number
}

/**
 * The list when an ancestor scrolls – the browser chrome's content column.
 * @param props The people, where the list sits, and the element that scrolls it.
 * @returns The rows, watching that element.
 */
function ElementScrolledRows(
  props: VariantProps & { readonly scrollParent: HTMLElement },
): ReactElement {
  // The virtualizer hands back functions that are new every render, which the React
  // Compiler cannot memoize, so it skips this component rather than memoizing a stale
  // list.
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const virtualizer = useVirtualizer<HTMLElement, HTMLDivElement>({
    count: props.people.length,
    estimateSize: () => estimatedRowHeight,
    getScrollElement: () => props.scrollParent,
    overscan,
    scrollMargin: props.scrollMargin,
  })
  return (
    <Rows
      listRef={props.listRef}
      onFirstVisibleChange={props.onFirstVisibleChange}
      people={props.people}
      registerJump={props.registerJump}
      resetKey={props.resetKey}
      scrollMargin={props.scrollMargin}
      virtualizer={virtualizer}
    />
  )
}

/**
 * The list when the document scrolls – the shell chrome, and Storybook.
 * @param props The people, and where the list sits.
 * @returns The rows, watching the window.
 */
function WindowScrolledRows(props: VariantProps): ReactElement {
  const virtualizer = useWindowVirtualizer<HTMLDivElement>({
    count: props.people.length,
    estimateSize: () => estimatedRowHeight,
    overscan,
    scrollMargin: props.scrollMargin,
  })
  return <Rows {...props} virtualizer={virtualizer} />
}

export interface PeopleListProps {
  /**
   * Fires with the index of the topmost row in the viewport as the reader scrolls, so
   * the screen can mark where in the list they are.
   */
  readonly onFirstVisibleChange?: (index: number) => void
  /**
   * The people to list, already narrowed and in reading order. Every one of them scrolls
   * as part of one list; only those near the viewport get rows.
   */
  readonly people: readonly Participant[]
  /**
   * Receives the list's jump control once the rows are live – how a caller scrolls to a
   * row that has no DOM yet. Called again whenever the control is remade.
   */
  readonly registerJump?: (jump: (index: number) => void) => void
  /**
   * A value that changes when the narrowing does – the list scrolls back to its top when
   * it sees a new one, so a narrowed list is never entered past its end.
   */
  readonly resetKey: string
}

/**
 * The people as a virtual list: as tall as every row would be, so the scrollbar reads as
 * one long list, with only the rows near the viewport in the document, so narrowing
 * costs the same for a unit as for the whole contingent.
 *
 * Finds what scrolls it once it is in the document, then hands the rows to the variant
 * that watches that – which is why the first render draws an empty list at the right
 * place rather than nothing.
 * @param props The people to list, and what says the narrowing changed.
 * @returns The list.
 */
export function PeopleList(props: PeopleListProps): ReactElement {
  const { onFirstVisibleChange, people, registerJump, resetKey } = props

  const listRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState<
    { readonly margin: number; readonly parent: HTMLElement | undefined } | undefined
  >(undefined)

  useLayoutEffect(() => {
    const list = listRef.current
    if (list === null) {
      return
    }
    const parent = scrollParentOf(list)
    setScroll({ margin: offsetWithin(list, parent), parent })
  }, [])

  if (scroll === undefined) {
    // In the document but not yet measured – an empty list at the right place, so the
    // measurement reads where the rows will start. At its estimated full height, so a
    // restored scroll position has somewhere to land: the chrome restores it before
    // this second render, and a scroller too short at that moment clamps it to the top.
    return (
      <div
        className="people-list"
        ref={listRef}
        style={{ height: `${String(people.length * estimatedRowHeight)}px` }}
      />
    )
  }

  const shared = {
    listRef,
    onFirstVisibleChange,
    people,
    registerJump,
    resetKey,
    scrollMargin: scroll.margin,
  }
  return scroll.parent === undefined ? (
    <WindowScrolledRows {...shared} />
  ) : (
    <ElementScrolledRows {...shared} scrollParent={scroll.parent} />
  )
}
