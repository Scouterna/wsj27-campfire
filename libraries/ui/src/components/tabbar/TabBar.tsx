import { Link, useRouterState } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import type { AppPath } from "../../routing/routes"

import "./TabBar.css"

/**
 * One section in the bar: what to call it, where it leads, and the icon above the label.
 */
export interface TabBarItem {
  /**
   * The id the current screen's `tab` names.
   */
  readonly id: string
  /**
   * The section's name, as the bar shows it.
   */
  readonly label: string
  /**
   * The section's start screen.
   */
  readonly path: AppPath
  /**
   * The icon above the label.
   */
  readonly icon: ReactNode
}

export interface TabBarProps {
  /**
   * The sections, in the order they are shown.
   */
  readonly items: readonly TabBarItem[]
  /**
   * Which section the current screen belongs to, by id. A screen belonging to none
   * lights up nothing.
   */
  readonly current: string | undefined
  /**
   * What tapping the section already shown at its clean start does. That tap never
   * navigates, so without this it does nothing.
   */
  readonly onReselect?: (() => void) | undefined
}

/**
 * The tab bar across the bottom of a phone: one control per section, the current one
 * lit. Where it sits – fixed to the bottom, hidden once a side menu takes over – is the
 * consumer's business, not the component's.
 *
 * @param props The sections, the current one, and the reselect behavior.
 * @returns The strip.
 */
export function TabBar(props: TabBarProps): ReactElement {
  const location = useRouterState({ select: (state) => state.location })

  return (
    <nav className="tabstrip" aria-label="Sektioner">
      {props.items.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          search={{}}
          aria-current={item.id === props.current ? "page" : undefined}
          onClick={(event) => {
            // Swallowed only when the section's start is already exactly what is
            // shown, and the caller decides what that means – scrolling it up,
            // typically. An address narrowed by search params navigates instead, so a
            // tab always means the section's own clean start.
            if (location.pathname !== item.path || location.searchStr !== "") {
              return
            }

            event.preventDefault()
            props.onReselect?.()
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
