import { Link, useRouterState } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import type { AppPath } from "../../routing/routes"
import { Logo } from "../logo/Logo"

import "./SideMenu.css"

/**
 * One section in the menu: what to call it, where it leads, and the icon beside the
 * label.
 */
export interface SideMenuItem {
  /**
   * The id the current screen's `tab` names.
   */
  readonly id: string
  /**
   * The section's name, as the menu shows it.
   */
  readonly label: string
  /**
   * The section's start screen.
   */
  readonly path: AppPath
  /**
   * The icon beside the label.
   */
  readonly icon: ReactNode
}

export interface SideMenuProps {
  /**
   * The sections, in the order they are listed.
   */
  readonly items: readonly SideMenuItem[]
  /**
   * Which section the current screen belongs to, by id. A screen belonging to none
   * lights up nothing.
   */
  readonly current: string | undefined
  /**
   * What clicking the section already shown does. Without it the click navigates like
   * any other, which on the same page is a no-op.
   */
  readonly onReselect?: (() => void) | undefined
  /**
   * A line under the sections saying what is on its way – so a menu of two items
   * reads as a beginning rather than the whole app. Nothing renders without it.
   */
  readonly teaser?: string
  /**
   * What sits at the foot of the column, under the sections – the profile control.
   */
  readonly footer?: ReactNode
}

/**
 * The desktop side menu: the contingent's mark, the sections as a pill list, and a
 * footer slot beneath them. Whether it is shown at all – it yields to the tab bar on a
 * phone – is the consumer's business, not the component's.
 *
 * @param props The sections, the current one, and the slots around them.
 * @returns The menu column.
 */
export function SideMenu(props: SideMenuProps): ReactElement {
  const location = useRouterState({ select: (state) => state.location })

  return (
    <nav className="sidemenu" aria-label="Sektioner">
      <Logo alt="WSJ27 – Swedish Contingent" />
      <div className="sidemenu-items">
        {props.items.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            search={{}}
            aria-current={item.id === props.current ? "page" : undefined}
            onClick={(event) => {
              // Swallowed only when the section's start is already exactly what is
              // shown. An address narrowed by search params navigates instead, so a
              // section link always means the section's own clean start.
              if (location.pathname !== item.path || location.searchStr !== "") {
                return
              }

              event.preventDefault()
              props.onReselect?.()
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
      {props.teaser === undefined ? null : <p className="sidemenu-teaser">{props.teaser}</p>}
      <div className="sidemenu-footer">{props.footer}</div>
    </nav>
  )
}
