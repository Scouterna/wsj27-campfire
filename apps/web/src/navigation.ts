import { setNavDirection, wasPopExpected, type NavDirection } from "@scouterna/wsj27-campfire-ui"
import { useLayoutEffect } from "react"

/**
 * The application's navigation memory, and the bookkeeping that writes it. All of it
 * in-memory on purpose: after a reload the trails are empty, and every reader falls
 * back to what a cold deep link shows.
 */

/**
 * The history index of the current entry. TanStack Router keys its entries with a
 * state object; the index is stamped here instead, on the first visit, so the trails
 * below can be keyed by position in the stack.
 * @returns The stamped index, or undefined on an entry no navigation has stamped yet.
 */
export function historyIndex(): number | undefined {
  return (history.state as { key?: string; __index?: number } | null)?.__index
}

/**
 * Stamp the current entry with its position, counting from wherever the session
 * started. Called by the bookkeeping on every navigation.
 * @param previous The index the last navigation left.
 * @param type How the entry was arrived at.
 * @returns The entry's index, stamped now or already there.
 */
function stampIndex(previous: number | undefined, type: "push" | "pop" | "replace"): number {
  const existing = historyIndex()
  if (existing !== undefined) {
    return existing
  }
  const index = type === "push" ? (previous ?? -1) + 1 : (previous ?? 0)
  history.replaceState({ ...(history.state as object), __index: index }, "")
  return index
}

/**
 * The resolved title of each history entry the session has visited, by history index –
 * what the eyebrow reads to name where back actually goes.
 */
export const titleTrail = new Map<number, string>()

/**
 * Raised by a section switch – a side-menu or tab-strip click – and consumed when the
 * navigation lands. A screen reached that way is a section's start, however deep its
 * declared parent chain: it gets no eyebrow, because there is nowhere back leads.
 */
export const sectionSwitch = { pending: false }

/**
 * The history entries that were arrived at through a section switch, by history index.
 * Membership survives leaving and popping back, so a section root stays a root.
 */
export const rootTrail = new Set<number>()

/**
 * How this reader wants a scripted scroll to move. A scripted smooth scroll is the
 * author's request rather than the platform's own animation, so the motion preference
 * has to be read here – unlike a CSS transition, no browser applies it for us.
 * @returns "instant" where the reader prefers reduced motion, "smooth" otherwise.
 */
export function scrollBehavior(): ScrollBehavior {
  return matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
}

/**
 * How far a scripted return to the top may glide. Past this it lands instantly: a
 * glide across thousands of pixels of virtualized rows shows only a blur, and rows
 * measuring themselves mid-flight write to the scroller, which cancels the glide.
 */
const glideWithinPx = 10_000

/**
 * Scroll whichever of the window and the content column scrolls at this width to the
 * top – the answer to tapping the section control of the page already shown. Nearby
 * it glides and far away it lands at once – and either way it settles: a virtual
 * list measuring its rows can cancel a glide mid-flight, so a scroll that stalls
 * short of the top is finished with an instant write rather than left hanging.
 */
export function scrollToTop(): void {
  const column = document.querySelector(".page")
  const columnTop = column instanceof HTMLElement ? column.scrollTop : 0
  const distance = Math.max(scrollY, columnTop)
  const behavior: ScrollBehavior = distance > glideWithinPx ? "instant" : scrollBehavior()

  scrollTo({ top: 0, behavior })
  column?.scrollTo({ top: 0, behavior })

  // The settle: follow the scroll frame by frame, and the moment it stands still
  // anywhere but the top – a canceled glide, a late measurement nudge – finish the
  // move instantly. Bounded, so a reader who starts scrolling somewhere else mid-way
  // is never fought for long.
  const startedAt = performance.now()
  let lastSeen = -1
  let stillFrames = 0
  const settle = (): void => {
    const settling = document.querySelector(".page")
    const position = Math.max(scrollY, settling instanceof HTMLElement ? settling.scrollTop : 0)
    if (position === 0 || performance.now() - startedAt > 1200) {
      return
    }
    if (position === lastSeen) {
      stillFrames += 1
    } else {
      stillFrames = 0
      lastSeen = position
    }
    if (stillFrames >= 3) {
      scrollTo(0, 0)
      if (settling instanceof HTMLElement) {
        settling.scrollTop = 0
      }
      return
    }
    requestAnimationFrame(settle)
  }
  requestAnimationFrame(settle)
}

/**
 * Where each history entry had scrolled the content column, by history index. The
 * desktop content column scrolls itself – the window holds still so the rubberband
 * stays off the chrome – which puts it beyond the router's own scroll restoration, so
 * the same per-entry memory is kept here by hand.
 */
const scrollTrail = new Map<number, number>()

/**
 * The same memory for the window, which is the scroller at phone width.
 */
const windowScrollTrail = new Map<number, number>()

const lastNavigation: { type: "push" | "pop" | "replace"; index: number | undefined } = {
  type: "push",
  index: undefined,
}

/**
 * How long a pop's restore keeps trying before accepting where the page is. Long
 * enough for the router to mount the arriving screen and a virtual list to size
 * itself; short enough that the reader's own scrolling is never fought for long.
 */
const restoreWindowMs = 800

/**
 * Put both scrollers back where the entry left them, retrying frame by frame until
 * the position sticks or the window closes – the arriving screen's content mounts a
 * beat after the location changes, and until it does the position has nowhere to go.
 * A newer navigation ends the retry at once, so a quick second pop is never fought.
 * @param index The history entry being restored.
 * @param windowTop Where the window had scrolled.
 * @param columnTop Where the content column had scrolled.
 */
function restoreScroll(index: number, windowTop: number, columnTop: number): void {
  const startedAt = performance.now()
  const apply = (): void => {
    if (lastNavigation.index !== undefined && lastNavigation.index !== index) {
      return
    }
    scrollTo(0, windowTop)
    const column = document.querySelector(".page")
    if (column instanceof HTMLElement) {
      column.scrollTop = columnTop
    }
    const isColumnSettled =
      !(column instanceof HTMLElement) || Math.abs(column.scrollTop - columnTop) < 1
    const isWindowSettled = Math.abs(scrollY - windowTop) < 1
    if ((isColumnSettled && isWindowSettled) || performance.now() - startedAt > restoreWindowMs) {
      return
    }
    requestAnimationFrame(apply)
  }
  apply()
}

/**
 * Declare that the navigation about to run is a push, for one the router is asked for
 * directly rather than through a link.
 *
 * The click listener marks every link and the pop listener marks every pop, so a
 * programmatic `navigate` is the one navigation nothing sees: without this it would be
 * stamped with whatever the *previous* navigation was. After a pop that means reusing
 * the entry's own index, so the new entry overwrites the title, root, and scroll trails
 * of the one it was pushed on top of.
 */
export function markPush(): void {
  lastNavigation.type = "push"
}

/**
 * Everything the chrome has to remember about a navigation: the title of each history
 * entry, which entries are section roots, the phase mark the crumb morph reads, and
 * the scroll positions. Runs on every location change, from the chrome.
 *
 * @param pathname Where the navigation landed.
 * @param title What the screen showing now is called.
 */
export function useNavigationBookkeeping(pathname: string, title: string | undefined): void {
  // Before paint, so the scroll restore is what the view transition snapshots. The
  // index is stamped first, because everything else is keyed by it.
  useLayoutEffect(() => {
    const index = stampIndex(lastNavigation.index, lastNavigation.type)
    const isPop = lastNavigation.type === "pop"
    lastNavigation.index = index

    // Scroll restoration, ours alone: a pop returns to where the scroller was left; a
    // push or replace starts at the top. Written before paint, so the position is what
    // the view transition snapshots – and, on a pop, kept warm for a moment: the
    // router swaps the outlet a beat after the location changes, so at this point the
    // leaving screen still decides the scroller's height and a tall position clamps
    // to nothing. The retry re-applies it once the arriving screen has the height.
    if (isPop) {
      restoreScroll(index, windowScrollTrail.get(index) ?? 0, scrollTrail.get(index) ?? 0)
    } else {
      scrollTo(0, 0)
      const column = document.querySelector(".page")
      if (column instanceof HTMLElement) {
        column.scrollTop = 0
      }
    }

    // The root trail: a pending section switch is resolved to the entry it landed on.
    // A push that is not one clears the mark, because going back and pushing anew
    // reuses the index; a pop changes no membership.
    if (!isPop) {
      if (sectionSwitch.pending) {
        rootTrail.add(index)
      } else {
        rootTrail.delete(index)
      }
    }
    sectionSwitch.pending = false

    // The phase mark for the crumb morph: written after the old page was snapshotted
    // and before the new one is, which is what lets one stylesheet name the title in
    // the leaving state and the eyebrow in the arriving one.
    document.documentElement.dataset["vtNew"] = ""
  }, [pathname])

  // The title trail: what each history entry was called, by its index. The screen's
  // own PageTitle can arrive a beat after the navigation, so the trail follows the
  // title too.
  useLayoutEffect(() => {
    const index = historyIndex()
    if (index !== undefined && title !== undefined && title !== "") {
      titleTrail.set(index, title)
    }
  }, [pathname, title])
}

/**
 * The listeners that decide direction, installed once. The source of the click decides
 * it, not the shape of the URL: the side menu and the tab strip cross-fade between
 * sections, and everything else – content, the top bar – pushes, however the paths
 * compare. Back is the back control's to set. One capture-phase listener sees every
 * link before the router does, so no module has to know navigations are animated.
 * @param event The click, seen at capture phase before the router acts on it.
 */
const onClick = (event: MouseEvent): void => {
  // A modified click opens elsewhere and navigates nothing here.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return
  }

  const anchor = (event.target as Element | null)?.closest('a[href^="/"]')
  if (!anchor) {
    return
  }

  // A link that knows better says so itself, through its `data-nav`.
  const attribute = (anchor as HTMLAnchorElement).dataset["nav"]
  const declared = isDirection(attribute) ? attribute : undefined
  const isSection = anchor.closest(".sidemenu-items, .tabstrip") !== null
  const fallback: NavDirection = isSection ? "fade" : "forward"
  setNavDirection(declared ?? fallback)
  delete document.documentElement.dataset["vtNew"]

  lastNavigation.type = "push"

  // A section switch lands on a start screen, wherever it was clicked from – noted
  // now, resolved to a history entry when the navigation lands.
  if (isSection && new URL((anchor as HTMLAnchorElement).href).pathname !== location.pathname) {
    sectionSwitch.pending = true
  }
}

// On a pop we did not ask for, disarm the transition before the router snapshots.
// Asked for or not, the phase mark comes off before the old page is snapshotted.
const onPop = (): void => {
  if (!wasPopExpected()) {
    setNavDirection("none")
  }
  lastNavigation.type = "pop"
  delete document.documentElement.dataset["vtNew"]
}

// Registered at module evaluation rather than in wireNavigation: the router
// subscribes to popstate when routes.tsx creates it, popstate listeners run in
// registration order, and React flushes the pop's render – restore included –
// synchronously inside the router's own handler. A listener registered after the
// router learns about the pop only after the restore already ran as a push and
// scrolled the page to its top. routes.tsx imports this module, so evaluating here
// is what puts this listener first.
// eslint-disable-next-line unicorn/no-top-level-side-effects -- the registration order against the router is the whole point; see above
addEventListener("popstate", onPop)

// Every scroll writes the entry's position; a passive listener keeps it free. On the
// document and in the capture phase, because the column does not exist until the first
// signed-in screen renders – and scroll events do not bubble, so only capture sees
// every scroller's events from above.
const onScroll = (event: Event): void => {
  const index = historyIndex()
  if (index === undefined) {
    return
  }
  const target = event.target
  if (target instanceof HTMLElement && target.classList.contains("page")) {
    scrollTrail.set(index, target.scrollTop)
  } else if (target === document) {
    windowScrollTrail.set(index, window.scrollY)
  }
}

// Whether a replacement state is one the current entry's stamp has to be carried into.
// Anything that is not an object is passed on as it came – the trails simply have no key
// on such an entry, which is what a state nobody here wrote already means.
function requiresIndex(data: unknown): data is Record<string, unknown> {
  if (typeof data !== "object" || data === null) {
    return false
  }
  return !("__index" in data) || data.__index === undefined
}

/**
 * Install the listeners, once, at startup.
 */
export function wireNavigation(): void {
  // Ours alone. Left on "auto", WebKit restores a pop's scroll position itself,
  // asynchronously, racing the SPA's own render and the view transition – that race is
  // what puts the painted page out of step with where taps land.
  history.scrollRestoration = "manual"

  // A replace navigation – a screen writing its state into the address – hands the
  // router's own state object to `replaceState`, and that object carries no `__index`.
  // Without carrying the stamp across, the entry loses the key its scroll and title
  // trails are kept under, so back lands nameless at the top of the page.
  const replaceState = history.replaceState.bind(history)
  history.replaceState = (data: unknown, unused: string, url?: string | URL | null): void => {
    const index = historyIndex()
    const carried = index !== undefined && requiresIndex(data) ? { ...data, __index: index } : data
    replaceState(carried, unused, url)
  }

  document.addEventListener("click", onClick, { capture: true })
  document.addEventListener("scroll", onScroll, { capture: true, passive: true })

  // A view transition in a hidden tab is skipped by the browser, and the router's
  // untouched `finished` promise then rejects with an InvalidStateError nobody can act
  // on. Expected, not an error – everything else is left to surface.
  addEventListener("unhandledrejection", (event) => {
    if (event.reason instanceof DOMException && event.reason.name === "InvalidStateError") {
      event.preventDefault()
    }
  })
}

const directions = new Set<string>(["forward", "back", "fade", "none"])

function isDirection(value: string | undefined): value is NavDirection {
  return value !== undefined && directions.has(value)
}
