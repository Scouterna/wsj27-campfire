import {
  host,
  onShellMessage,
  sendToShell,
  type ScreenItem,
  type ScreenMessage,
  type SectionSpec,
  type SessionProfile,
  type ToWeb,
} from "@scouterna/wsj27-campfire-host"
import {
  BackIcon,
  ChatIcon,
  CheckIcon,
  CopyIcon,
  dismissFullScreen,
  expectPop,
  HomeIcon,
  IdCardIcon,
  MailIcon,
  MoreIcon,
  ParticipantsIcon,
  PhoneIcon,
  SearchIcon,
  setNavDirection,
  useIsFullScreen,
  usePageActions,
  type LinkTarget,
  type NavDirection,
  type PageActionsProps,
} from "@scouterna/wsj27-campfire-ui"
import { isValidElement, useEffect, useMemo, useRef, type ReactElement } from "react"

import {
  afterTransition,
  historyIndex,
  markPush,
  scrollToTop,
  transitionStarted,
} from "./navigation"

/**
 * The translation between what a page declares for its bar and what crosses the bridge.
 * A page declares React elements and callbacks; the bridge carries names and ids, so the
 * callbacks stay here and a tap comes back by id.
 */

/**
 * The semantic name each icon crosses the bridge as, keyed by the component itself
 * rather than its name, because a production build minifies function names away.
 */
const iconNames = new Map<unknown, string>([
  [BackIcon, "back"],
  [ChatIcon, "chat"],
  [CheckIcon, "check"],
  [CopyIcon, "copy"],
  [HomeIcon, "home"],
  [IdCardIcon, "idcard"],
  [MailIcon, "mail"],
  [MoreIcon, "more"],
  [ParticipantsIcon, "participants"],
  [PhoneIcon, "phone"],
  [SearchIcon, "search"],
])

/**
 * The semantic name of an icon element.
 *
 * @param icon The element a page declared, if any.
 * @returns The name, or undefined for no icon and for one the vocabulary lacks.
 */
export function iconName(icon: ReactElement | undefined): string | undefined {
  return isValidElement(icon) ? iconNames.get(icon.type) : undefined
}

/**
 * What a tapped item does on the web side, kept here while its id crosses the bridge.
 */
export type ShellDeed =
  | { readonly kind: "link"; readonly link: LinkTarget }
  | { readonly kind: "open"; readonly href: string }
  | { readonly kind: "run"; readonly run: () => void }

/**
 * A page's declared bar, as the bridge carries it and as the web acts on it.
 */
export interface ShellBar {
  /**
   * The primary actions, as the screen message carries them.
   */
  readonly actions: readonly ScreenItem[]
  /**
   * What each id does, for the tap that comes back.
   */
  readonly deeds: ReadonlyMap<string, ShellDeed>
  /**
   * The overflow menu's groups, as the screen message carries them.
   */
  readonly menu: readonly (readonly ScreenItem[])[]
}

/**
 * Turns a page's declared actions into the bridge's items. The ids are positions, which
 * is enough because a tap is answered against the declaration that was reported last.
 * An entry whose work answers with a receipt runs, and its receipt is not shown, because
 * a native menu has closed before the work ends.
 *
 * @param declared What the page declared, if anything.
 * @returns The items and what each does.
 */
export function shellBar(declared: PageActionsProps | undefined): ShellBar {
  const deeds = new Map<string, ShellDeed>()
  const actions: ScreenItem[] = []
  const action = declared?.action
  if (action !== undefined) {
    actions.push({ icon: iconName(action.icon), id: "primary", label: action.label })
    deeds.set(
      "primary",
      action.link === undefined
        ? { kind: "run", run: action.onPress }
        : { kind: "link", link: action.link },
    )
  }

  const menu: ScreenItem[][] = [[]]
  const entries = declared?.menu ?? []
  for (const [index, item] of entries.entries()) {
    if (item === "divider") {
      menu.push([])
      continue
    }
    const id = `menu-${String(index)}`
    const base = { icon: iconName(item.icon), id, label: item.label }
    if ("unavailable" in item) {
      menu.at(-1)?.push({ ...base, unavailable: item.unavailable })
      continue
    }
    menu.at(-1)?.push(base)
    if ("onSelect" in item) {
      deeds.set(id, { kind: "run", run: item.onSelect })
    } else if ("onPerform" in item) {
      const perform = item.onPerform
      deeds.set(id, {
        kind: "run",
        run: () => {
          void perform()
        },
      })
    } else if ("link" in item) {
      deeds.set(id, { kind: "link", link: item.link })
    } else {
      deeds.set(id, { kind: "open", href: item.href })
    }
  }

  return { actions, deeds, menu: menu.filter((group) => group.length > 0) }
}

/**
 * At most two initials, uppercased, for the native bar's avatar.
 *
 * @param name The signed-in person's full name.
 * @returns The initials, or a question mark for a name without letters.
 */
export function initialsOf(name: string): string {
  const initials = name
    .split(" ")
    .filter((word) => word !== "")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
  return initials === "" ? "?" : initials
}

/**
 * The back control a screen offers – its label for the browser's heading, and the move.
 */
export interface BackControl {
  readonly label: string
  /**
   * Go up one screen, animated in the given direction – "back" unless the caller's own
   * gesture already animated it.
   */
  readonly onBack: (direction?: NavDirection) => void
}

/**
 * The router, as far as a shell's taps move it. Handed in rather than imported, because
 * the router is built where the routes are.
 */
export interface ShellRouter {
  /**
   * Move through the webview's history by the given number of entries.
   */
  readonly go: (delta: number) => void
  /**
   * Push an origin-relative address or a typed link.
   */
  readonly navigate: (target: LinkTarget | string) => void
}

/**
 * What a reply to the shell acts on: the screen showing now, and the router.
 */
export interface ShellScreen {
  readonly back: BackControl | undefined
  readonly bar: ShellBar
  readonly router: ShellRouter
}

/**
 * Does what the shell reports was tapped, on the screen showing now.
 *
 * @param message What the shell sent.
 * @param screen The screen's back control and bar as last reported, and the router.
 */
export function answerShell(message: ToWeb, screen: ShellScreen): void {
  switch (message.type) {
    case "action": {
      perform(screen.bar.deeds.get(message.id), screen.router)
      return
    }
    case "back": {
      // Something filling the screen is a layer of its own, and back closes it first.
      if (dismissFullScreen()) {
        return
      }
      // The shell's own swipe already animated the move, so the web pops unanimated.
      screen.back?.onBack(message.animated === false ? "none" : "back")
      return
    }
    case "forward": {
      setNavDirection("none")
      expectPop()
      screen.router.go(1)
      return
    }
    case "open": {
      setNavDirection("forward")
      markPush()
      screen.router.navigate(message.path)
      return
    }
    case "popToRoot": {
      // The tab's webview started its history at the section's start, so entry zero is
      // the root, however many screens from other sections were pushed since. The
      // shell has already settled a scrolled page to its top before asking.
      const index = historyIndex()
      if (index === undefined || index === 0) {
        scrollToTop()
        return
      }
      setNavDirection("back")
      expectPop()
      screen.router.go(-index)
      return
    }
  }
}

/**
 * Does what a tapped item was declared to do.
 *
 * @param deed What the item does, or undefined for an id the screen no longer has.
 * @param router The router a link moves.
 */
function perform(deed: ShellDeed | undefined, router: ShellRouter): void {
  switch (deed?.kind) {
    case "link": {
      setNavDirection("forward")
      markPush()
      router.navigate(deed.link)
      return
    }
    case "open": {
      // A mailto: or a tel:, which the shell hands off its origin to the system.
      location.assign(deed.href)
      return
    }
    case "run": {
      deed.run()
      return
    }
    case undefined: {
      return
    }
  }
}

/**
 * A plain history pop, for a screen in a shell's tab that declares no parent and was
 * pushed on top of the tab's first entry.
 *
 * @param router The router the pop moves.
 * @returns The pop, or undefined at the tab's first entry.
 */
export function historyBack(router: ShellRouter): BackControl | undefined {
  const index = historyIndex()
  if (index === undefined || index === 0) {
    return undefined
  }
  return {
    label: "Tillbaka",
    onBack: (direction: NavDirection = "back") => {
      const pop = (): void => {
        setNavDirection(direction)
        expectPop()
        router.go(-1)
      }
      // A pop the platform animated cannot wait, because its gesture has already shown
      // the page beneath.
      if (direction === "none") {
        pop()
      } else {
        void afterTransition(pop)
      }
    },
  }
}

/**
 * What the shell chrome knows about the screen showing now.
 */
export interface ShellBridgeProps {
  /**
   * The screen's way back, or undefined where back does not apply.
   */
  readonly back: BackControl | undefined
  readonly profile: SessionProfile
  readonly router: ShellRouter
  /**
   * The sections the person may open, in tab order.
   */
  readonly sections: readonly SectionSpec[]
  readonly theme: string
  readonly title: string
}

/**
 * The screen report waiting to go out, which a newer one replaces.
 */
const screenReport: { latest: Omit<ScreenMessage, "v"> | undefined } = { latest: undefined }

/**
 * Loaded once the display face is, or once waiting for it has taken long enough.
 */
const displayFace: { loaded: Promise<unknown> | undefined } = { loaded: undefined }

/**
 * How long the first screen report may wait for the display face. The first report ends
 * the shell's launch cover, so the wait is bounded, and a face that is slower than this
 * pops in rather than holding the app back.
 */
const displayFaceWithinMs = 1000

/**
 * Start loading the display face, ahead of the first screen that draws in it. The first
 * screen report waits for it, because the shell lifts its launch cover on that report,
 * and a unit's name or a headline that pops in after the cover has gone reads as a
 * glitch.
 *
 * @returns A promise settling once the face has loaded, failed, or kept the app waiting
 *   long enough, and never rejecting.
 */
export async function loadDisplayFace(): Promise<void> {
  displayFace.loaded ??= Promise.race([
    Promise.allSettled([document.fonts.load('1em "Bravely Script"')]),
    new Promise((resolve) => {
      setTimeout(resolve, displayFaceWithinMs)
    }),
  ])
  await displayFace.loaded
}

/**
 * Send a screen report when the page it describes starts to show – as a view transition
 * starts to slide, or at once when none is under way – so the native bar changes with
 * the page rather than ahead of it while the transition's update is held. A newer
 * report replaces one still waiting, so the shell hears only the latest.
 *
 * @param message The report.
 * @returns A promise settling once the report has gone out or been replaced.
 */
async function reportScreen(message: Omit<ScreenMessage, "v">): Promise<void> {
  screenReport.latest = message
  await Promise.all([loadDisplayFace(), transitionStarted()])
  if (screenReport.latest !== message) {
    return
  }
  screenReport.latest = undefined
  sendToShell(message)
}

/**
 * Keeps the shell told what the screen, the session, and the theme are, and does what
 * the shell reports was tapped. Each report is sent again only when it changes.
 *
 * @param props What the chrome knows about the screen showing now.
 */
export function useShellBridge(props: ShellBridgeProps): void {
  const { back, profile, router, theme, title } = props
  const declared = usePageActions()
  // The Apple shell keeps the page still with its bars away until what filled the screen
  // is back in its place, and brings them back over it then.
  const isFullScreen = useIsFullScreen(host.platform === "ios")
  const bar = useMemo(() => shellBar(declared), [declared])
  const canGoBack = back !== undefined

  // Compared as text, because the list and the profile are rebuilt on every render.
  const session = JSON.stringify({ profile, sections: props.sections })
  useEffect(() => {
    const { profile: reported, sections } = JSON.parse(session) as {
      profile: SessionProfile
      sections: readonly SectionSpec[]
    }
    sendToShell({ profile: reported, sections, signedIn: true, type: "session" })
  }, [session])

  useEffect(() => {
    sendToShell({ name: theme, type: "theme" })
  }, [theme])

  useEffect(() => {
    void reportScreen({
      actions: bar.actions,
      canGoBack,
      fullScreen: isFullScreen,
      menu: bar.menu,
      title,
      type: "screen",
    })
  }, [bar, canGoBack, isFullScreen, title])

  // The subscription lives as long as the chrome, and answers against the screen as it
  // stands when the tap arrives rather than as it stood when it subscribed.
  const latest = useRef<ShellScreen>({ back, bar, router })
  useEffect(() => {
    latest.current = { back, bar, router }
  })
  useEffect(
    () =>
      onShellMessage((message) => {
        answerShell(message, latest.current)
      }),
    [],
  )
}
