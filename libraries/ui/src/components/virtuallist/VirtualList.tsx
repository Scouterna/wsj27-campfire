import { useVirtualizer, useWindowVirtualizer, type Virtualizer } from "@tanstack/react-virtual"
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"

import "./VirtualList.css"

/**
 * Rows rendered beyond the viewport on each side, so a flick does not outrun the list.
 */
const overscan = 8

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
 * everything above the list that the virtualizer must count before its first row.
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
 * What both variants below hand the rows: the list's props, where it sits, and the
 * virtualizer watching whatever scrolls it.
 */
interface RowsProps<T> extends VirtualListProps<T> {
  /**
   * The list element, measured again whenever what sits above it moves.
   */
  readonly listRef: RefObject<HTMLDivElement | null>
  /**
   * How far the list's top sits below its scroll parent's top at scroll position zero.
   */
  readonly scrollMargin: number
  /**
   * The virtualizer placing the rows, watching whatever scrolls the list.
   */
  readonly virtualizer:
    Virtualizer<HTMLElement, HTMLDivElement> | Virtualizer<Window, HTMLDivElement>
}

/**
 * The rows the virtualizer says exist, placed where it says. Shared by the variants
 * below, which differ only in the hook that made the virtualizer.
 * @param props The items, where the list sits, and the virtualizer placing the rows.
 * @returns The sizing container, and the rows inside it.
 */
function Rows<T>(props: RowsProps<T>): ReactElement {
  const { items, keyOf, label, listRef, onFirstVisibleChange, registerJump, renderRow } = props
  const { resetKey, scrollMargin, virtualizer } = props

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
      aria-label={label}
      className="virtual-list"
      ref={listRef}
      role="list"
      style={{ height: `${String(virtualizer.getTotalSize())}px` }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const item = items[row.index]
        return item === undefined ? null : (
          <div
            aria-posinset={row.index + 1}
            aria-setsize={items.length}
            className="virtual-list-row"
            data-index={row.index}
            key={keyOf(item)}
            ref={virtualizer.measureElement}
            role="listitem"
            style={{ transform: `translateY(${String(row.start - scrollMargin)}px)` }}
          >
            {renderRow(item)}
          </div>
        )
      })}
    </div>
  )
}

/**
 * What a variant needs to build its virtualizer and hand the rows on.
 */
type VariantProps<T> = Omit<RowsProps<T>, "virtualizer">

/**
 * The list when an ancestor scrolls – the browser chrome's content column.
 * @param props The items, where the list sits, and the element that scrolls it.
 * @returns The rows, watching that element.
 */
function ElementScrolledRows<T>(
  props: VariantProps<T> & { readonly scrollParent: HTMLElement },
): ReactElement {
  // The virtualizer hands back functions that are new every render, which the React
  // Compiler cannot memoize, so it skips this component rather than memoizing a stale
  // list.
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const virtualizer = useVirtualizer<HTMLElement, HTMLDivElement>({
    count: props.items.length,
    estimateSize: () => props.estimatedRowHeight,
    getScrollElement: () => props.scrollParent,
    overscan,
    scrollMargin: props.scrollMargin,
  })
  return <Rows {...props} virtualizer={virtualizer} />
}

/**
 * The list when the document scrolls – the shell chrome, and Storybook.
 * @param props The items, and where the list sits.
 * @returns The rows, watching the window.
 */
function WindowScrolledRows<T>(props: VariantProps<T>): ReactElement {
  const virtualizer = useWindowVirtualizer<HTMLDivElement>({
    count: props.items.length,
    estimateSize: () => props.estimatedRowHeight,
    overscan,
    scrollMargin: props.scrollMargin,
  })
  return <Rows {...props} virtualizer={virtualizer} />
}

/**
 * The items a `VirtualList` holds, how each becomes a row, and how a caller follows and
 * steers the scroll.
 */
export interface VirtualListProps<T> {
  /**
   * A row's height at the default text size – the virtualizer's first guess, corrected
   * by measuring each row it draws, because rem-based type makes a row as tall as the
   * reader's Dynamic Type setting says. It also sizes the list before it is measured.
   */
  readonly estimatedRowHeight: number
  /**
   * The items to list, in reading order. Every one of them scrolls as part of one list;
   * only those near the viewport get rows.
   */
  readonly items: readonly T[]
  /**
   * An item's key, unique in the list and stable across renders.
   */
  readonly keyOf: (item: T) => string
  /**
   * What the list is called for assistive technology.
   */
  readonly label: string
  /**
   * Fires with the index of the topmost row in the viewport as the reader scrolls, or
   * -1 while what sits above the list is still in view.
   */
  readonly onFirstVisibleChange?: ((index: number) => void) | undefined
  /**
   * Receives the list's jump control once the rows are live – how a caller scrolls to a
   * row that has no DOM yet, or to the very top with -1. Called again whenever the
   * control is remade.
   */
  readonly registerJump?: ((jump: (index: number) => void) => void) | undefined
  /**
   * Draws one item's row, usually a `Row`.
   */
  readonly renderRow: (item: T) => ReactNode
  /**
   * A value that changes when the items are narrowed – the list scrolls back to its top
   * when it sees a new one, so a narrowed list is never entered past its end. Left out,
   * the list never resets.
   */
  readonly resetKey?: string | undefined
}

/**
 * A virtual list for a `Card`: as tall as every row would be, so the scrollbar reads as
 * one long list, with only the rows near the viewport in the document, so a long list
 * costs what a short one does.
 *
 * Finds what scrolls it once it is in the document, then hands the rows to the variant
 * that watches that – which is why the first render draws an empty list at the right
 * place rather than nothing.
 * @param props The items, how each becomes a row, and how the scroll is followed.
 * @returns The list.
 */
export function VirtualList<T>(props: VirtualListProps<T>): ReactElement {
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
    // Read through the ref every time, because the placeholder measured first is replaced
    // by the rows' own list, and a detached element measures as zero.
    const measure = (): void => {
      const node = listRef.current
      if (node === null) {
        return
      }
      const margin = offsetWithin(node, parent)
      setScroll((current) =>
        current?.margin === margin && current.parent === parent ? current : { margin, parent },
      )
    }
    measure()
    // What sits above the list can change height after it is measured – a card that
    // grows, a search that narrows what is above – and a stale margin puts every jump and
    // every row that far off. Whatever grows above the list grows the scrolling content,
    // so watching that is watching everything that can move the list.
    const observer = new ResizeObserver(measure)
    const content = (parent ?? document.body).children
    for (const child of content) {
      observer.observe(child)
    }
    return () => {
      observer.disconnect()
    }
  }, [])

  if (scroll === undefined) {
    // In the document but not yet measured – an empty list at the right place, so the
    // measurement reads where the rows will start. At its estimated full height, so a
    // restored scroll position has somewhere to land: the chrome restores it before
    // this second render, and a scroller too short at that moment clamps it to the top.
    return (
      <div
        className="virtual-list"
        ref={listRef}
        style={{ height: `${String(props.items.length * props.estimatedRowHeight)}px` }}
      />
    )
  }

  const shared = { ...props, listRef, scrollMargin: scroll.margin }
  return scroll.parent === undefined ? (
    <WindowScrolledRows {...shared} />
  ) : (
    <ElementScrolledRows {...shared} scrollParent={scroll.parent} />
  )
}
