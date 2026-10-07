import { setNavDirection, wasPopExpected, type NavDirection } from "@scouterna/wsj27-campfire-ui"
import { rootRouteId, useRouterState } from "@tanstack/react-router"
import { useLayoutEffect } from "react"

/**
 * The application's navigation memory, and the bookkeeping that writes it. All of it
 * lives in memory, so after a reload the trails are empty and every reader falls back
 * to what a cold deep link shows.
 */

/**
 * The history index of the current entry, as the router's history keeps it in the
 * entry's state – one more on a push, the same on a replace, counting from wherever the
 * session started.
 * @returns The index, or undefined on an entry the router's history has not written.
 */
export function historyIndex(): number | undefined {
  return (history.state as { __TSR_index?: number } | null)?.__TSR_index
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
 * How far a scripted return to the top may glide. Past this it lands instantly,
 * because a glide across thousands of pixels of virtualized rows shows only a blur,
 * and rows measuring themselves mid-flight write to the scroller and cancel the glide.
 */
const glideWithinPx = 10_000

/**
 * Scroll whichever of the window and the content column scrolls at this width to the
 * top – the answer to tapping the section control of the page already shown. Nearby
 * it glides and far away it lands at once, and a scroll that stalls short of the top
 * is finished with an instant write rather than left hanging.
 */
export function scrollToTop(): void {
  const column = document.querySelector(".page")
  const columnTop = column instanceof HTMLElement ? column.scrollTop : 0
  const distance = Math.max(scrollY, columnTop)
  const behavior: ScrollBehavior = distance > glideWithinPx ? "instant" : scrollBehavior()

  scrollTo({ top: 0, behavior })
  column?.scrollTo({ top: 0, behavior })

  // A virtual list measuring its rows can cancel a glide mid-flight, so the scroll is
  // followed frame by frame and finished instantly the moment it stands still anywhere
  // but the top. Bounded, so a reader who starts scrolling elsewhere is never fought
  // for long.
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
 * desktop content column scrolls itself, which puts it beyond the router's own scroll
 * restoration, so the per-entry memory is kept here by hand.
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
 * How often a restore tries again, about once a frame.
 */
const retryMs = 16

/**
 * How long a view transition holds the arriving page for its restore. Past this the
 * slide starts wherever the page is and the restore carries on unheld, because a back
 * that waits visibly for its content reads as a hang rather than as a pop.
 */
const holdWithinMs = 200

/**
 * How many retries in a row a position may stand still at the farthest the page lets
 * it scroll before the restore accepts it. Content that came back shorter than it was
 * left can never reach the old position, and waiting for it only freezes the page.
 */
const stillAtEndRetries = 3

/**
 * The arriving page's restore. While a view transition's update is held, a restore
 * waits for the update to end rather than writing the scroll position into it, because
 * WebKit on iOS moves its scroll view the moment the position is written, under the
 * leaving page's frozen image, and past that page's end it shows bare paper until the
 * slide starts. Written last, the move lands in the frame the arriving page is
 * captured in. `restore` is the one under way, which the transition waits for before
 * it captures – undefined once it has settled, and on a push.
 */
const arrival: {
  deferred: (() => Promise<undefined>) | undefined
  isUpdating: boolean
  restore: Promise<undefined> | undefined
} = { deferred: undefined, isUpdating: false, restore: undefined }

/**
 * Restore a popped page now, or once the view transition's update is over when one is
 * being held.
 * @param index The history entry being restored.
 * @param windowTop Where the window had scrolled.
 * @param columnTop Where the content column had scrolled.
 * @returns The restore when it started now, settling once it ends, or undefined when it
 * waits for the update.
 */
function scheduleRestore(
  index: number,
  windowTop: number,
  columnTop: number,
): Promise<undefined> | undefined {
  if (arrival.isUpdating) {
    arrival.deferred = () => restoreScroll(index, windowTop, columnTop)
    return undefined
  }
  return restoreScroll(index, windowTop, columnTop)
}

/**
 * Where the latest pop put the page back, until the router has finished rendering it.
 * The router resets the scroll to the top once it has rendered any navigation, a pop
 * included, and that lands after a restore that has already settled.
 */
const poppedTo: {
  target: { columnTop: number; index: number; until: number; windowTop: number } | undefined
} = { target: undefined }

/**
 * Put a popped page back where it was left once the router has rendered it, undoing the
 * router's own reset to the top. Called from the router's rendered event, after the
 * router's own handler, in the same task, so the reset is never painted. Only the pop's
 * own render is answered, because a later one – a search narrowed in place – is the
 * reader's, and starts at the top as the router has it.
 */
export function reassertPoppedScroll(): void {
  const target = poppedTo.target
  poppedTo.target = undefined
  if (
    target === undefined ||
    performance.now() > target.until ||
    lastNavigation.index !== target.index ||
    historyIndex() !== target.index
  ) {
    return
  }
  void scheduleRestore(target.index, target.windowTop, target.columnTop)
}

/**
 * The view transition under way, from the moment it starts until it has finished, and
 * whether its animation has started yet.
 */
const transitions: { current: ViewTransition | undefined; isStarting: boolean } = {
  current: undefined,
  isStarting: false,
}

/**
 * Whether scroll events are kept out of the trails. Set when a navigation starts and
 * cleared once the arriving page has committed and its transition has finished, because
 * in between the window scrolls for reasons that are not the reader's – the arriving
 * page's restore, a shell moving its bars – while the history index already names
 * another entry or still names the leaving one.
 */
const trailFreeze = { isFrozen: false, thawAt: 0 }

/**
 * How long a freeze can last with no navigation landing to end it – a click on a link
 * to the page already showing navigates nowhere.
 */
const freezeWithinMs = 2000

/**
 * Whether scroll events are being kept out of the trails now.
 * @returns True between a navigation's start and the end of its arrival.
 */
function isTrailFrozen(): boolean {
  return trailFreeze.isFrozen && performance.now() < trailFreeze.thawAt
}

/**
 * Remember where the leaving entry rests, keep scroll events out of the trails until the
 * arrival is over, and decide whether the title can morph. Called the moment a
 * navigation is decided, before anything moves.
 * @param leaving The leaving entry, or undefined before the first navigation has landed.
 * @param arriving The entry a pop returns to, or undefined for a push, which arrives at
 * the top.
 */
function startNavigation(leaving: number | undefined, arriving?: number): void {
  const column = document.querySelector(".page")
  // A page still arriving is where its restore has put it so far, not where it was
  // left, so its trail keeps the target instead.
  if (leaving !== undefined && !isTrailFrozen()) {
    windowScrollTrail.set(leaving, scrollY)
    if (column instanceof HTMLElement) {
      scrollTrail.set(leaving, column.scrollTop)
    }
  }
  trailFreeze.isFrozen = true
  trailFreeze.thawAt = performance.now() + freezeWithinMs
  poppedTo.target = undefined

  // The crumb morph moves the title between the leaving page and the arriving one, so
  // it runs only where the title is in view on both, as a native large title folds into
  // the back button only while it shows. Otherwise the text would fly in from behind
  // the bar, or off the top of the screen.
  const isColumnScroller =
    column instanceof HTMLElement && getComputedStyle(column).overflowY !== "visible"
  const arrivingTrail = isColumnScroller ? scrollTrail : windowScrollTrail
  const arrivingTop = arriving === undefined ? 0 : (arrivingTrail.get(arriving) ?? 0)
  const scrolled = isColumnScroller ? column.scrollTop : scrollY
  const isCrumbShown = isTitleInView(scrolled, scrolled) && isTitleInView(scrolled, arrivingTop)
  if (isCrumbShown) {
    delete document.documentElement.dataset["crumbOff"]
  } else {
    document.documentElement.dataset["crumbOff"] = ""
  }
}

/**
 * Whether the page's title would still show below the bar with its scroller at a given
 * position, estimated from the heading showing now – every page's heading sits at the
 * same place in the chrome.
 * @param scrolled Where the page's scroller stands now.
 * @param top The position to test.
 * @returns True when some of the title would be below the bar.
 */
function isTitleInView(scrolled: number, top: number): boolean {
  const title = document.querySelector(".pageheading h1")
  if (!(title instanceof HTMLElement)) {
    return false
  }
  const bar = document.querySelector(".topbar")?.getBoundingClientRect()
  const column = document.querySelector(".page")
  const ceiling =
    bar !== undefined && bar.height > 0 ? bar.bottom : (column?.getBoundingClientRect().top ?? 0)
  return title.getBoundingClientRect().bottom + scrolled - top > ceiling
}

/**
 * The nearest the window can scroll to a position, given how tall the document is now.
 * @param top The position asked for.
 * @returns The position, held within the document's scroll range.
 */
function reachableWindowTop(top: number): number {
  const end = Math.max(0, document.documentElement.scrollHeight - innerHeight)
  return Math.min(top, end)
}

/**
 * Put both scrollers back where the entry left them, retrying frame by frame until
 * the position sticks or the window closes – the arriving screen's content mounts a
 * beat after the location changes, and until it does the position has nowhere to go.
 * A position the content no longer reaches is accepted at the content's end once the
 * end stops moving. A newer navigation ends the retry at once, so a quick second pop is
 * never fought.
 * @param index The history entry being restored.
 * @param windowTop Where the window had scrolled.
 * @param columnTop Where the content column had scrolled.
 * @returns A promise settling once the retry ends, however it ends.
 */
function restoreScroll(index: number, windowTop: number, columnTop: number): Promise<undefined> {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  const startedAt = performance.now()
  // Closed by a timer as well as by the retry, so nothing waiting on the restore waits
  // longer than the window.
  const timeout = setTimeout(() => {
    resolve(undefined)
  }, restoreWindowMs)
  const finish = (): void => {
    clearTimeout(timeout)
    resolve(undefined)
  }
  let lastEnd = ""
  let stillAtEnd = 0
  const announced = { columnTop: -1, windowTop: -1 }
  const apply = (): void => {
    if (lastNavigation.index !== undefined && lastNavigation.index !== index) {
      finish()
      return
    }
    scrollTo(0, windowTop)
    const column = document.querySelector(".page")
    if (column instanceof HTMLElement) {
      column.scrollTop = columnTop
    }
    // A scroll event waits for the next frame, and no frame runs while a transition's
    // update is held, so a virtual list would be captured with its rows still where it
    // mounted and bare paper at the restored position. Announced now, it renders the
    // rows there before anything is captured or shown.
    if (scrollY !== announced.windowTop) {
      announced.windowTop = scrollY
      document.dispatchEvent(new Event("scroll", { bubbles: true }))
    }
    if (column instanceof HTMLElement && column.scrollTop !== announced.columnTop) {
      announced.columnTop = column.scrollTop
      column.dispatchEvent(new Event("scroll"))
    }
    const columnEnd =
      column instanceof HTMLElement
        ? Math.min(columnTop, Math.max(0, column.scrollHeight - column.clientHeight))
        : columnTop
    const isColumnAt = (top: number): boolean =>
      !(column instanceof HTMLElement) || Math.abs(column.scrollTop - top) < 1
    const windowEnd = reachableWindowTop(windowTop)
    const isReached = Math.abs(scrollY - windowTop) < 1 && isColumnAt(columnTop)
    // Short of the target only because the content ends there, and the end has stood
    // still for a few tries – the content is as long as it is going to get.
    const end = `${String(windowEnd)}:${String(columnEnd)}`
    const isShort = windowEnd < windowTop || columnEnd < columnTop
    if (isShort && Math.abs(scrollY - windowEnd) < 1 && isColumnAt(columnEnd) && end === lastEnd) {
      stillAtEnd += 1
    } else {
      stillAtEnd = 0
    }
    lastEnd = end
    const isAtEnd = stillAtEnd >= stillAtEndRetries
    if (isReached || isAtEnd || performance.now() - startedAt > restoreWindowMs) {
      finish()
      return
    }
    // A timer rather than a frame, because no frame runs while a transition's update is
    // pending, and that is exactly where the restore has to land.
    setTimeout(apply, retryMs)
  }
  apply()
  return promise
}

/**
 * Declare that the navigation about to run is a push, for one the router is asked for
 * directly rather than through a link.
 *
 * The click listener marks every link and the pop listener marks every pop, so a
 * programmatic navigation is the one nothing sees, and without this it is stamped with
 * whatever the *previous* navigation was. After a pop that reuses the entry's own
 * index, and the new entry overwrites the title, root, and scroll trails of the one it
 * was pushed on top of. It also remembers where the leaving page rests, before anything
 * moves it.
 */
export function markPush(): void {
  startNavigation(historyIndex())
  lastNavigation.type = "push"
}

/**
 * The path of the screen the router has rendered, which is what the chrome describes.
 *
 * The router publishes the address it is heading for before it starts the view
 * transition, renders the screen there inside the transition's update, and marks the
 * navigation resolved only once the update is over. Read from the address, a push's
 * bookkeeping – the scroll to the top among it – runs before the leaving page is
 * captured, so the page jumps to its top as it slides away; read from the resolved
 * location, a pop's restored scroll lands after the arriving page is captured. The
 * committed screen is the one moment in between.
 *
 * @returns The committed screen's path, or the address while the screen is the root's
 * not-found page.
 */
export function useRenderedPathname(): string {
  return useRouterState({
    select: (state) => {
      const leaf = state.matches.at(-1)
      return leaf === undefined || leaf.routeId === rootRouteId
        ? state.location.pathname
        : leaf.pathname
    },
  })
}

/**
 * Everything the chrome has to remember about a navigation – the title of each history
 * entry, which entries are section roots, the phase mark the crumb morph reads, and
 * the scroll positions. Runs once the router has rendered each navigation's screen.
 *
 * @param pathname Where the navigation landed, as `useRenderedPathname` reads it.
 * @param title What the screen showing now is called.
 */
export function useNavigationBookkeeping(pathname: string, title: string | undefined): void {
  // Before paint, so the scroll position is what the view transition snapshots as the
  // arriving page. Nothing here writes history: the router's history hears every write
  // and would answer one with a second navigation, and a second transition with it.
  useLayoutEffect(() => {
    // The router's history writes an index into every entry it makes, the first one
    // included, so a missing one means the first entry.
    const index = historyIndex() ?? 0
    const isPop = lastNavigation.type === "pop"
    lastNavigation.index = index

    // A pop returns to where the scroller was left; a push or replace starts at the top.
    // The top is written into the trails too, because an entry pushed after a pop
    // reuses the popped one's index, and a page already at the top fires no scroll
    // event to overwrite what the popped one left there.
    if (isPop) {
      const windowTop = windowScrollTrail.get(index) ?? 0
      const columnTop = scrollTrail.get(index) ?? 0
      arrival.restore = scheduleRestore(index, windowTop, columnTop)
      poppedTo.target = { columnTop, index, until: performance.now() + restoreWindowMs, windowTop }
    } else {
      scrollTo(0, 0)
      const column = document.querySelector(".page")
      if (column instanceof HTMLElement) {
        column.scrollTop = 0
      }
      windowScrollTrail.set(index, 0)
      scrollTrail.set(index, 0)
    }

    // Without a view transition the arrival is over once the screen has committed.
    if (transitions.current === undefined) {
      trailFreeze.isFrozen = false
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

  // A screen can name itself a beat after the navigation lands, so the title trail
  // follows the title as well as the address.
  useLayoutEffect(() => {
    const index = historyIndex()
    if (index !== undefined && title !== undefined && title !== "") {
      titleTrail.set(index, title)
    }
  }, [pathname, title])
}

/**
 * The click listener that decides direction. The source of the click decides it rather
 * than the shape of the URL – the side menu and the tab strip cross-fade between
 * sections, and everything else pushes, however the paths compare, unless the link
 * declares a direction of its own, as the profile control does. Back is the back
 * control's to set. One capture-phase listener sees every link before the router does,
 * so no module has to know navigations are animated.
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
  markPush()

  // A section switch lands on a start screen, wherever it was clicked from – noted
  // now, resolved to a history entry when the navigation lands.
  if (isSection && new URL((anchor as HTMLAnchorElement).href).pathname !== location.pathname) {
    sectionSwitch.pending = true
  }
}

// On a pop we did not ask for, disarm the transition before the router snapshots. The
// history already stands at the arriving entry, so the leaving one is the last that
// landed.
const onPop = (): void => {
  if (!wasPopExpected()) {
    setNavDirection("none")
  }
  startNavigation(lastNavigation.index, historyIndex())
  lastNavigation.type = "pop"
}

// Registered at module evaluation rather than at wiring, because popstate listeners run
// in registration order and React flushes the pop's render – restore included –
// synchronously inside the router's own listener, added when the router is created. A
// listener registered after it hears of the pop only once the restore has run as a push
// and scrolled the page to its top. The router's module imports this one, so evaluating
// here puts this listener first.
// eslint-disable-next-line unicorn/no-top-level-side-effects -- it must be registered before the router's own popstate listener
addEventListener("popstate", onPop)

// Every scroll writes the entry's position; a passive listener keeps it free. On the
// document and in the capture phase, because the column does not exist until the first
// signed-in screen renders – and scroll events do not bubble, so only capture sees
// every scroller's events from above.
const onScroll = (event: Event): void => {
  if (isTrailFrozen()) {
    return
  }
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

/**
 * How long a waiter looks for the first animated frame after a transition is ready,
 * before it accepts the transition as started anyway.
 */
const firstFrameWithinMs = 300

/**
 * A promise settling once the view transition under way has started to animate – the
 * moment the leaving page starts to slide – or at once when none is starting. A shell
 * changes its bar when this settles, so the native title moves with the page rather
 * than ahead of it while the update is held for a restore.
 * @returns The promise, which never rejects.
 */
export async function transitionStarted(): Promise<void> {
  const transition = transitions.isStarting ? transitions.current : undefined
  if (transition === undefined) {
    return
  }
  // A skipped transition rejects its ready, and has started as far as a waiter cares.
  const [ready] = await Promise.allSettled([transition.ready])
  if (ready.status === "fulfilled") {
    await firstAnimatedFrame()
  }
}

/**
 * A promise settling once a view transition's animation has drawn a frame. WebKit
 * resolves a transition's ready before it composites the first animated frame – a
 * tenth of a second and more before the page visibly moves – and an animation's clock
 * starts only once its first frame is on screen, so that clock is the signal.
 * @returns The promise, settling at the latest after a bounded wait, never rejecting.
 */
async function firstAnimatedFrame(): Promise<void> {
  const startedAt = performance.now()
  const { promise, resolve } = Promise.withResolvers<undefined>()
  const look = (): void => {
    const animations = document
      .getAnimations()
      .filter((animation) =>
        (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition"),
      )
    const isMoving = animations.some((animation) => Number(animation.currentTime ?? 0) > 0)
    if (animations.length === 0 || isMoving || performance.now() - startedAt > firstFrameWithinMs) {
      resolve(undefined)
      return
    }
    requestAnimationFrame(look)
  }
  look()
  await promise
}

/**
 * Run something once the view transition under way has finished, or as soon as possible
 * when none is. A navigation started during another one skips it, and the skipped page
 * snaps to its end before the next one moves, so a back pressed mid-push waits for the
 * push to land, as a native stack does.
 * @param run What to run.
 * @returns A promise settling once it has run.
 */
export async function afterTransition(run: () => void): Promise<void> {
  const transition = transitions.current
  if (transition !== undefined) {
    await Promise.allSettled([transition.finished])
  }
  run()
}

/**
 * Wraps every view transition the router starts. A pop's scroll restore starts once the
 * update has rendered the arriving screen, and the update is held until it has settled,
 * so the arriving page is captured where it was left: its content – a list sized by its
 * data – can arrive a frame or two after the screen commits, and until then the
 * position has nowhere to go. Captured then, the page would slide in at its top and jump
 * down once the slide had finished. The hold is bounded, and a push restores nothing and
 * waits for nothing.
 *
 * A navigation declared `none` skips its transition, so the arriving page paints at
 * once under whatever the platform already animated, and nothing of ours fades on top.
 * The phase mark for the crumb morph comes off here too, before the leaving page is
 * captured, whoever started the navigation.
 */
function wrapViewTransitions(): void {
  if (typeof document.startViewTransition !== "function") {
    return
  }
  const start = document.startViewTransition.bind(document)
  document.startViewTransition = (options) => {
    const update = typeof options === "function" ? options : options?.update
    const isDisarmed = document.documentElement.dataset["nav"] === "none"
    const held = async (): Promise<void> => {
      // A disarmed transition is skipped and shows nothing, so its restore runs at once.
      arrival.isUpdating = !isDisarmed
      try {
        await update?.()
      } finally {
        arrival.isUpdating = false
      }
      const deferred = arrival.deferred
      arrival.deferred = undefined
      if (deferred !== undefined) {
        arrival.restore = deferred()
      }
      const restore = arrival.restore
      arrival.restore = undefined
      if (isDisarmed || restore === undefined) {
        return
      }
      await Promise.race([
        restore,
        new Promise((resolve) => {
          setTimeout(resolve, holdWithinMs)
        }),
      ])
    }
    delete document.documentElement.dataset["vtNew"]
    const transition = start(typeof options === "object" ? { ...options, update: held } : held)
    if (isDisarmed) {
      transition.skipTransition()
    }
    void track(transition)
    return transition
  }
}

/**
 * Follow a view transition through its start and its end, as the one under way until a
 * newer one replaces it. Its end is also the end of the arrival, so the trails take
 * scroll events again.
 * @param transition The transition just started.
 */
async function track(transition: ViewTransition): Promise<void> {
  transitions.current = transition
  transitions.isStarting = true
  await Promise.allSettled([transition.ready])
  if (transitions.current === transition) {
    transitions.isStarting = false
  }
  await Promise.allSettled([transition.finished])
  if (transitions.current !== transition) {
    return
  }
  transitions.current = undefined
  trailFreeze.isFrozen = false
}

/**
 * Install the listeners, once, at startup.
 */
export function wireNavigation(): void {
  // Left on "auto", WebKit restores a pop's scroll position itself, asynchronously,
  // racing the SPA's own render and the view transition, and that race puts the painted
  // page out of step with where taps land.
  history.scrollRestoration = "manual"

  wrapViewTransitions()

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
