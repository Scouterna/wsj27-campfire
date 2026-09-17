import { useEffect, useState, type ReactElement, type ReactNode } from "react"

import "./NavigationBar.css"

export interface NavigationBarProps {
  /**
   * What the screen is called – shown only once the page has scrolled the large
   * heading away.
   */
  readonly title: string
  /**
   * What sits at the bar's trailing edge – the overflow menu and the profile control.
   * The bar only places it.
   */
  readonly trailing?: ReactNode | undefined
}

/**
 * The condensed bar across a phone's top edge: transparent over the page's own
 * heading, and – once the heading scrolls away – a translucent glass strip carrying
 * the title small. The page's real `h1` is `PageHeading`'s; the bar's copy is spoken
 * by neither, so a reader never hears the name twice.
 *
 * @param props The title, and the trailing controls.
 * @returns The bar.
 */
export function NavigationBar(props: NavigationBarProps): ReactElement {
  const isCondensed = useIsCondensed()

  return (
    <header className={isCondensed ? "topbar is-condensed" : "topbar"}>
      <span className="topbar-title" aria-hidden="true">
        {props.title}
      </span>
      <div className="topbar-trailing">{props.trailing}</div>
    </header>
  )
}

/**
 * Whether the window has scrolled past the large heading. With hysteresis – condense
 * past 28, expand only back under 8 – because the condensing itself removes scroll
 * range, which would otherwise flip the state straight back.
 * @returns True once the bar should carry the title.
 */
function useIsCondensed(): boolean {
  const [isCondensed, setCondensed] = useState(false)

  useEffect(() => {
    const onScroll = (): void => {
      setCondensed((was) => (was ? window.scrollY > 8 : window.scrollY > 28))
    }
    onScroll()
    addEventListener("scroll", onScroll, { passive: true })
    return () => {
      removeEventListener("scroll", onScroll)
    }
  }, [])

  return isCondensed
}
