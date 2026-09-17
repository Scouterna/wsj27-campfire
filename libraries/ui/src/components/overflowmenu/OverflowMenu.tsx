import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react"

import { MoreIcon } from "../../foundations/icons/set/MoreIcon"

import "./OverflowMenu.css"

/**
 * One entry in the menu – something to do, or the literal `"divider"` drawing a rule
 * between groups.
 */
export type OverflowMenuItem =
  | "divider"
  | {
      /**
       * What the entry is called.
       */
      readonly label: string
      /**
       * What choosing it does. The menu closes itself first.
       */
      readonly onSelect: () => void
    }

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
 * what the entries do belongs to the caller.
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
  // Which end the panel takes focus at, decided by the key that opened it: ArrowUp opens
  // a menu at its last entry, as a menu button does everywhere else.
  const opensAt = useRef<"first" | "last">("first")
  const name = props.label ?? "Fler åtgärder"

  useEffect(() => {
    if (!isOpen) {
      return
    }

    // Focus moves into the menu on open, which is the half of `role="menu"` that makes
    // the arrow keys reachable at all.
    entriesOf(panel.current)
      .at(opensAt.current === "last" ? -1 : 0)
      ?.focus()

    return dismissOnPressOutside(root.current, () => {
      setOpen(false)
    })
  }, [isOpen])

  /**
   * Close, and put focus back where it came from. Every keyboard exit runs through here,
   * because a menu that unmounts under the focus leaves it on the body and the reader
   * loses their place.
   */
  const closeToTrigger = (): void => {
    setOpen(false)
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
      setOpen(false)
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
          setOpen((open) => !open)
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
              // Position, not content: two dividers are indistinguishable.
              <div key={index} className="overflow-divider" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                className="overflow-item"
                role="menuitem"
                // The menu itself owns the arrow keys, so its entries stay out of the
                // document's tab order and Tab means "leave" rather than "next entry".
                tabIndex={-1}
                onClick={() => {
                  closeToTrigger()
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

/**
 * The menu's focusable entries, in the order they are drawn – the dividers are not among
 * them, because a separator is never a stop.
 * @param panel The open panel, or null before it mounts.
 * @returns The entry buttons, in document order.
 */
function entriesOf(panel: HTMLDivElement | null): readonly HTMLButtonElement[] {
  return panel === null ? [] : [...panel.querySelectorAll<HTMLButtonElement>(".overflow-item")]
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
    entries.indexOf(document.activeElement as HTMLButtonElement),
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
 * @param at The index focus sits at, or -1 when it sits on neither entry.
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
