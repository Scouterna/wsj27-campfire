import { Link } from "@tanstack/react-router"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react"

import { MoreIcon } from "../../foundations/icons/set/MoreIcon"
import type { LinkTarget } from "../../routing/routes"

import "./OverflowMenu.css"

/**
 * How long a receipt stays on its entry before the menu closes. Long enough to be read
 * where the press landed, short enough that the menu is gone before anybody reaches for
 * it again.
 */
const receiptMs = 2000

/**
 * What an entry answers once its work is done, said on the entry itself before the menu
 * closes – the few words that tell a press that worked from one that did not.
 */
export interface OverflowMenuReceipt {
  /**
   * Set when the work failed, so the words wear the danger tone rather than the
   * theme's.
   */
  readonly isFailure?: true
  /**
   * What to say, in a few words – it is laid over the label, so it has the label's room.
   */
  readonly words: string
}

/**
 * What every choosable entry carries, whatever choosing it does.
 */
interface OverflowMenuEntry {
  /**
   * The glyph ahead of the label. Where any entry in a menu has one, the entries without
   * are indented to match, so every label starts on the same line.
   */
  readonly icon?: ReactElement
  /**
   * What the entry is called. Unique within a menu, because it is how the menu tells its
   * entries apart, and which of them a receipt belongs to.
   */
  readonly label: string
}

/**
 * One entry in the menu – something to do, work that answers, somewhere to go, an address
 * to open, an entry that cannot be chosen right now, or the literal `"divider"` drawing a
 * rule between groups.
 */
export type OverflowMenuItem =
  | "divider"
  | (OverflowMenuEntry & {
      /**
       * What choosing it does. The menu closes itself first.
       */
      readonly onSelect: () => void
    })
  | (OverflowMenuEntry & {
      /**
       * Work whose outcome the person has to be told. The menu stays open while it runs,
       * says the receipt on the entry, over its faded label, and closes itself once it
       * has been read. Must not reject – a failure is a receipt too.
       */
      readonly onPerform: () => Promise<OverflowMenuReceipt>
    })
  | (OverflowMenuEntry & {
      /**
       * Where the entry leads. Rendered as a real link, so the router treats choosing
       * it as the navigation it is. The menu closes itself on the way.
       */
      readonly link: LinkTarget
    })
  | (OverflowMenuEntry & {
      /**
       * The address the entry opens – a `mailto:` or a `tel:`, which the browser hands
       * to another application rather than the router to a screen. The menu closes
       * itself on the way.
       */
      readonly href: string
    })
  | (OverflowMenuEntry & {
      /**
       * Why the entry cannot be chosen right now, said small under its label. The entry
       * is drawn dimmed, is announced as disabled, and does nothing – it stays in the
       * menu, because an entry that vanishes cannot say why.
       */
      readonly unavailable: string
    })

export interface OverflowMenuProps {
  /**
   * The entries, in the order they are listed.
   */
  readonly items: readonly OverflowMenuItem[]
  /**
   * The trigger's accessible name. "Fler åtgärder" without one.
   */
  readonly label?: string
}

/**
 * The overflow menu: a round glass trigger that opens the page's extra actions as a
 * dropdown. It closes on a choice, on Escape, on Tab, and on any press outside itself;
 * what the entries do belongs to the caller. An entry whose work answers keeps the menu
 * open long enough to say so, on the entry itself – where the press landed, which is
 * where the eyes still are.
 *
 * It follows the ARIA menu button pattern rather than only looking like one. Declaring
 * `role="menu"` is a promise that arrow keys move between the entries and that focus
 * lives inside the menu while it is open – a screen reader announces the entry count and
 * a keyboard user expects to walk it – so the keys are wired here and focus returns to
 * the trigger on the way out.
 *
 * @param props The entries, and the trigger's accessible name.
 * @returns The trigger, and the open menu when it is open.
 */
export function OverflowMenu(props: OverflowMenuProps): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  // Which end the panel takes focus at, decided by the key that opened it, because
  // ArrowUp opens a menu at its last entry, as a menu button does everywhere else.
  const opensAt = useRef<"first" | "last">("first")
  const receipts = useReceipts()
  const name = props.label ?? "Fler åtgärder"
  const hasIcons = props.items.some((item) => item !== "divider" && item.icon !== undefined)

  const resetReceipts = receipts.reset
  const close = useCallback((): void => {
    resetReceipts()
    setOpen(false)
  }, [resetReceipts])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    // Focus moves into the menu on open, which is the half of `role="menu"` that makes
    // the arrow keys reachable at all.
    entriesOf(panel.current)
      .at(opensAt.current === "last" ? -1 : 0)
      ?.focus()

    return dismissOnPressOutside(root.current, close)
  }, [close, isOpen])

  /**
   * Close, and put focus back on the trigger. Escape and a choice leave through here,
   * because a menu that unmounts under the focus leaves it on the body and the reader
   * loses their place.
   */
  const closeToTrigger = (): void => {
    close()
    trigger.current?.focus()
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return
    }
    event.preventDefault()
    opensAt.current = event.key === "ArrowUp" ? "last" : "first"
    setOpen(true)
  }

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeToTrigger()
    } else if (event.key === "Tab") {
      // Tab leaves the menu rather than walking its entries, so the panel closes and the
      // browser's own focus order takes over from the trigger.
      close()
    } else if (didMoveFocus(panel.current, event.key)) {
      event.preventDefault()
    }
  }

  return (
    <div className="overflow" ref={root}>
      <button
        type="button"
        className="overflow-trigger"
        ref={trigger}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={name}
        onKeyDown={onTriggerKeyDown}
        onClick={() => {
          opensAt.current = "first"
          if (isOpen) {
            close()
          } else {
            setOpen(true)
          }
        }}
      >
        <MoreIcon size={20} strokeWidth={2.2} />
      </button>
      {isOpen ? (
        <div
          className="overflow-panel"
          ref={panel}
          role="menu"
          aria-label={name}
          onKeyDown={onPanelKeyDown}
        >
          {props.items.map((item, index) =>
            item === "divider" ? (
              // Keyed by position, because two dividers are indistinguishable.
              <div key={index} className="overflow-divider" role="separator" />
            ) : (
              <MenuEntry
                key={item.label}
                hasIcons={hasIcons}
                item={item}
                onChoose={closeToTrigger}
                onPerform={(chosen) => {
                  void receipts.perform(chosen, closeToTrigger)
                }}
                receipt={receipts.said?.label === item.label ? receipts.said : undefined}
              />
            ),
          )}
        </div>
      ) : null}
      {/* Outside the menu, which holds entries alone, and there from the opening, because
          a live region announces a change and not its own arrival. It goes with the
          menu, so a page is never left with a second, silent status region. */}
      {isOpen ? <Announcement words={receipts.said?.words} /> : null}
    </div>
  )
}

interface AnnouncementProps {
  /**
   * The receipt being said, or undefined while there is none.
   */
  readonly words: string | undefined
}

/**
 * The receipt for assistive technology: a status region that is heard and not seen,
 * beside the badge everybody else reads.
 * @param props The words to announce.
 * @returns The region, empty until there is something to say.
 */
function Announcement(props: AnnouncementProps): ReactElement {
  return (
    <span className="overflow-announcement" role="status">
      {props.words}
    </span>
  )
}

/**
 * The receipts of one menu: which entry is saying what, and the work behind it.
 */
interface Receipts {
  /**
   * Run an entry's work, say what it came to on the entry, and close once it has been
   * read. Work that finishes after the menu was closed some other way says nothing, and
   * a press while another entry is working or speaking is ignored.
   */
  readonly perform: (item: PerformingItem, close: () => void) => Promise<void>
  /**
   * Forget everything, because the menu is closing.
   */
  readonly reset: () => void
  /**
   * The receipt being said, and the label of the entry saying it.
   */
  readonly said: (OverflowMenuReceipt & { readonly label: string }) | undefined
}

/**
 * The machinery behind an entry whose work answers, kept apart from the menu's opening
 * and closing so each reads on its own.
 * @returns The receipt being said, and how to start and forget one.
 */
function useReceipts(): Receipts {
  const [said, setSaid] = useState<Receipts["said"]>()
  // True from the press on an entry whose work answers until the menu closes, so a
  // second press cannot start the work twice or cut the receipt short.
  const busy = useRef(false)
  // Counts the times the menu has closed, so work that outlives the menu it was chosen
  // in finds a different number and says nothing.
  const closings = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      // Unmounting counts as a closing, so work still running has nothing to come back to.
      closings.current += 1
      clearTimeout(timer.current)
    },
    [],
  )

  const reset = useCallback((): void => {
    closings.current += 1
    busy.current = false
    clearTimeout(timer.current)
    setSaid(undefined)
  }, [])

  const perform = useCallback(async (item: PerformingItem, close: () => void): Promise<void> => {
    if (busy.current) {
      return
    }
    busy.current = true
    const chosenIn = closings.current
    try {
      const answer = await item.onPerform()
      if (chosenIn === closings.current) {
        setSaid({ ...answer, label: item.label })
        timer.current = setTimeout(close, receiptMs)
      }
    } catch {
      // The contract is a receipt either way; work that throws instead has nothing to
      // say, and a menu left open and inert would be worse than one that closes. Only
      // the menu it was chosen in, though – never one opened since.
      if (chosenIn === closings.current) {
        close()
      }
    }
  }, [])

  return { perform, reset, said }
}

/**
 * An entry whose work answers with a receipt.
 */
type PerformingItem = Extract<OverflowMenuItem, { readonly onPerform: unknown }>

interface MenuEntryProps {
  /**
   * Whether any entry in the menu has an icon, which gives every entry the icon's room.
   */
  readonly hasIcons: boolean
  /**
   * The entry to draw – anything but a divider.
   */
  readonly item: Exclude<OverflowMenuItem, "divider">
  /**
   * Closes the menu, run on every choice before the entry's own effect.
   */
  readonly onChoose: () => void
  /**
   * Runs the work of an entry that answers, leaving the menu open for its receipt.
   */
  readonly onPerform: (item: PerformingItem) => void
  /**
   * The receipt to say in place of the label, when this entry's work just answered.
   */
  readonly receipt: OverflowMenuReceipt | undefined
}

/**
 * One choosable entry: a real link where the entry leads somewhere or opens an address,
 * a button where it does something. All stay out of the document's tab order – the menu
 * itself owns the arrow keys, and Tab means "leave" rather than "next entry".
 * @param props The entry, and how choosing closes the menu.
 * @returns The entry, as the menu draws it.
 */
function MenuEntry(props: MenuEntryProps): ReactElement {
  const item = props.item
  const content = (
    <>
      {props.hasIcons ? (
        <span className="overflow-item-icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className="overflow-item-text">
        {/* The label keeps its place under the receipt, unseen, because it is what
            sized the panel, and a panel that shrank around a shorter receipt would move
            under the hand that just pressed it. */}
        <span className="overflow-item-line">
          <span
            className={
              props.receipt === undefined
                ? "overflow-item-label"
                : "overflow-item-label overflow-item-label-answered"
            }
            aria-hidden={props.receipt === undefined ? undefined : true}
          >
            {item.label}
          </span>
          {props.receipt === undefined ? null : (
            <span
              className={
                props.receipt.isFailure
                  ? "overflow-item-receipt overflow-item-receipt-failure"
                  : "overflow-item-receipt"
              }
            >
              {props.receipt.words}
            </span>
          )}
        </span>
        {"unavailable" in item ? (
          <span className="overflow-item-reason">{item.unavailable}</span>
        ) : null}
      </span>
    </>
  )

  if ("unavailable" in item) {
    // `aria-disabled` rather than `disabled`, because a disabled button leaves the
    // arrow-key order, and an entry nobody can reach cannot say why it is unavailable.
    return (
      <button
        type="button"
        className="overflow-item overflow-item-unavailable"
        role="menuitem"
        tabIndex={-1}
        aria-disabled="true"
      >
        {content}
      </button>
    )
  }

  if ("href" in item) {
    return (
      <a
        className="overflow-item"
        role="menuitem"
        tabIndex={-1}
        href={item.href}
        onClick={props.onChoose}
      >
        {content}
      </a>
    )
  }

  if ("link" in item) {
    return (
      <Link
        className="overflow-item"
        role="menuitem"
        tabIndex={-1}
        to={item.link.to}
        params={item.link.params ?? {}}
        onClick={props.onChoose}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className="overflow-item"
      role="menuitem"
      tabIndex={-1}
      onClick={() => {
        if ("onPerform" in item) {
          props.onPerform(item)
        } else {
          props.onChoose()
          item.onSelect()
        }
      }}
    >
      {content}
    </button>
  )
}

/**
 * The menu's focusable entries, in the order they are drawn – the dividers are not among
 * them, because a separator is never a stop.
 * @param panel The open panel, or null before it mounts.
 * @returns The entries, in document order.
 */
function entriesOf(panel: HTMLDivElement | null): readonly HTMLElement[] {
  return panel === null ? [] : [...panel.querySelectorAll<HTMLElement>(".overflow-item")]
}

/**
 * Close the menu on any press outside it – content, chrome, anything – the way every
 * menu dismisses. Listens on the document, and only while the menu is open.
 * @param root The menu's root element, or null before it mounts.
 * @param close What a press outside should do.
 * @returns The teardown that removes the listener.
 */
function dismissOnPressOutside(root: HTMLDivElement | null, close: () => void): () => void {
  const onPress = (event: MouseEvent): void => {
    if (root && event.target instanceof Node && !root.contains(event.target)) {
      close()
    }
  }
  document.addEventListener("mousedown", onPress)
  return () => {
    document.removeEventListener("mousedown", onPress)
  }
}

/**
 * Move focus between the menu's entries for one navigation key.
 * @param panel The open panel, or null before it mounts.
 * @param key The key pressed.
 * @returns True when the key was one the menu handles and focus moved.
 */
function didMoveFocus(panel: HTMLDivElement | null, key: string): boolean {
  const entries = entriesOf(panel)
  const next = nextIndex(
    key,
    entries.indexOf(document.activeElement as HTMLElement),
    entries.length,
  )
  if (next === undefined) {
    return false
  }
  entries.at(next)?.focus()
  return true
}

/**
 * Where a navigation key moves focus within the menu, wrapping at both ends.
 * @param key The key pressed.
 * @param at The index focus sits at, or -1 when it sits on no entry.
 * @param count How many entries the menu has.
 * @returns The index to move to, or undefined for a key the menu does not handle.
 */
function nextIndex(key: string, at: number, count: number): number | undefined {
  if (count === 0) {
    return undefined
  }
  if (key === "ArrowDown") {
    return (at + 1) % count
  }
  if (key === "ArrowUp") {
    return (at <= 0 ? count : at) - 1
  }
  if (key === "Home") {
    return 0
  }
  if (key === "End") {
    return count - 1
  }
  return undefined
}
