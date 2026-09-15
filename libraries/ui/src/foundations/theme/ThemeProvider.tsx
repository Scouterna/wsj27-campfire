import { createContext, use, useEffect, type ReactElement, type ReactNode } from "react"

import { isTheme, themeFromSearch, type Theme } from "./Theme"

import "./ThemeProvider.css"

/**
 * Where the last resolved theme survives between visits, so the sign-in screen wears
 * the visitor's own colors before anyone has signed in.
 */
const storageKey = "campfire.theme"

const ThemeContext = createContext<Theme>("blue")

/**
 * The theme the previous session resolved, if the browser still has it. Undefined on a
 * first visit, and wherever storage is unavailable.
 *
 * @returns The stored theme, or undefined when there is none to read.
 */
export function storedTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem(storageKey)

    return isTheme(value) ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * The theme `?theme=<name>` asks for, if the address names one this application knows.
 *
 * @returns The requested theme, or undefined when the address asks for none.
 */
function requestedTheme(): Theme | undefined {
  return themeFromSearch(location.search)
}

/**
 * Remembers a theme for the next visit. Storage can refuse – a private window, a browser
 * configured to – and a refusal is not worth failing over: the only cost is signing in
 * blue next time.
 *
 * @param theme The theme to remember.
 */
function rememberTheme(theme: Theme): void {
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // A browser that refuses storage just signs in blue next time.
  }
}

/**
 * Marks the document with the theme this visit boots in, for the path before React
 * renders – the sign-in screen must not flash blue for a brown-unit leader. The address
 * wins over the stored preference, so `?theme=brown` colors the very first paint; the
 * provider takes over from here once it mounts.
 *
 * A theme asked for by address is remembered immediately, which is what makes it survive
 * the sign-in round trip and every later navigation without the parameter. From that
 * moment it is a stored preference like any other, so the register's answer still wins
 * once someone is signed in.
 */
export function applyInitialTheme(): void {
  const requested = requestedTheme()
  const theme = requested ?? storedTheme()
  if (theme === undefined) {
    return
  }

  document.documentElement.dataset["theme"] = theme
  if (requested !== undefined) {
    rememberTheme(requested)
  }
}

export type ThemeScopeProps = {
  /**
   * The subtree the theme applies to.
   */
  readonly children: ReactNode
  /**
   * The theme the scope wears.
   */
  readonly theme: Theme
}

/**
 * The pure half of theming: the context the few theme-reading components ask with
 * `useTheme`, and the layout-neutral `data-theme` wrapper the tokens key on – nothing
 * else. No document attribute, no meta, no storage, which is what lets Storybook's
 * decorator theme a story without touching the page around it. The application uses
 * `ThemeProvider`, which adds those effects on top.
 *
 * @param props The theme to wear, and the subtree that wears it.
 * @returns The themed subtree.
 */
export function ThemeScope(props: ThemeScopeProps): ReactElement {
  return (
    <ThemeContext value={props.theme}>
      <div className="theme-scope" data-theme={props.theme}>
        {props.children}
      </div>
    </ThemeContext>
  )
}

export type ThemeProviderProps = {
  /**
   * The themed subtree – in practice the whole application.
   */
  readonly children: ReactNode
  /**
   * The theme the whole document wears. The application resolves it – from the unit,
   * the management function, or the stored preference – and this provider only wears
   * it: onto the root element, into storage, and into context.
   */
  readonly theme: Theme
}

/**
 * Applies a theme and remembers it. The tokens do the actual theming: `data-theme` swaps
 * the theme's bright and ink, and every rule that reads them follows. The attribute goes
 * two places – onto a layout-neutral wrapper, so a provider anywhere themes exactly its
 * own subtree, Storybook included; and onto the document root, so body-level styling and
 * the pre-render boot path agree with it. The browser chrome follows too, through the
 * `theme-color` meta the shells and the PWA read.
 *
 * @param props The theme to wear, and the subtree that wears it.
 * @returns The themed subtree.
 */
export function ThemeProvider(props: ThemeProviderProps): ReactElement {
  const theme = props.theme

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme

    // Read back rather than duplicated: the stylesheet owns the values, and the meta
    // follows whatever ink the attribute above just selected.
    const ink = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-theme-ink")
      .trim()
    if (ink !== "") {
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ink)
    }

    rememberTheme(theme)
  }, [theme])

  return <ThemeScope theme={theme}>{props.children}</ThemeScope>
}

/**
 * The theme the nearest provider resolved – for the few components that pick an asset by
 * theme rather than reading a token.
 *
 * @returns The theme in force, blue where no provider is above the caller.
 */
export function useTheme(): Theme {
  return use(ThemeContext)
}
