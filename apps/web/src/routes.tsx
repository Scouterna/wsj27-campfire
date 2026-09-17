import {
  currentUser,
  keepSessionAlive,
  SignInScreen,
  signOut,
  type User,
} from "@scouterna/wsj27-campfire-authentication"
import { HomeScreen } from "@scouterna/wsj27-campfire-home"
import { host } from "@scouterna/wsj27-campfire-host"
import {
  participantsRoutes,
  participantsSectionLabel,
} from "@scouterna/wsj27-campfire-participants"
import {
  Card,
  cmtTheme,
  expectPop,
  HomeIcon,
  matchScreen,
  mountRoutes,
  NavigationBar,
  OverflowMenu,
  PageHeading,
  PageTitle,
  ParticipantsIcon,
  ProfilePill,
  rootRoute,
  setNavDirection,
  SideMenu,
  storedTheme,
  TabBar,
  ThemeProvider,
  unitTheme,
  usePageActions,
  usePageTitle,
  type Address,
  type AppPath,
  type Routes,
  type ScreenSpec,
  type SideMenuItem,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, RolesProvider, useRoles, type Role } from "@scouterna/wsj27-campfire-utils"
import { createRouter, Link, useRouterState, type RouteComponent } from "@tanstack/react-router"
import { useEffect, useState, type ReactElement, type ReactNode } from "react"

import {
  historyIndex,
  markPush,
  rootTrail,
  scrollToTop,
  sectionSwitch,
  titleTrail,
  useNavigationBookkeeping,
} from "./navigation"
import { Outline } from "./outline"
import { queryClient } from "./query"

/**
 * The route tree, and the chrome around it. This is the composition root: the one place
 * that knows every module, so no module has to know another.
 */

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The screen a signed-in person lands on. The application's own, because home is
     * the one address that is no single module's.
     */
    "/": Address<"web">
  }
}

/**
 * Every screen this build answers at, gathered from the modules and wrapped in the
 * section guard. The table only places screens – every page declares its own name
 * through `PageTitle`, because the page is what knows what it is called.
 */
const screens = guardScreens({
  "/": { Component: HomeScreen, tab: "home" },
  ...participantsRoutes,
} satisfies Routes)

/**
 * One section the menus can offer, and the rule that grants it.
 */
interface AppSection {
  /**
   * The icon beside or above the label.
   */
  readonly icon: ReactElement
  /**
   * The id the screens' `tab` fields name.
   */
  readonly id: string
  /**
   * Whether the roles grant the section.
   */
  readonly isGranted: (roles: readonly Role[]) => boolean
  /**
   * The menu label, given the roles – a leader's participants section wears their own
   * unit's name.
   */
  readonly label: (roles: readonly Role[]) => string
  /**
   * The section's start screen.
   */
  readonly path: AppPath
}

/**
 * The sections, in menu order: home for everyone, and the participants section for a
 * leader and for the CMT Administration function – for nobody else. The list grows as
 * modules land.
 */
const sections: readonly AppSection[] = [
  { icon: <HomeIcon />, id: "home", isGranted: () => true, label: () => "Hem", path: "/" },
  {
    icon: <ParticipantsIcon />,
    id: "participants",
    isGranted: (roles) => hasAnyRole(roles, "leader", "admin"),
    label: participantsSectionLabel,
    path: "/participants",
  },
]

/**
 * Whether the roles grant the section a screen belongs to. The one predicate: the
 * menus filter with it, the chrome resolves title, marked section, and back with it,
 * and the guard mounts with it. Fail closed on purpose – a screen whose tab names no
 * section is granted to nobody, so a typo hides a screen loudly in development rather
 * than publishing it to everyone.
 * @param tab The screen's declared section id.
 * @param roles The signed-in person's roles.
 * @returns True when the roles grant the named section.
 */
function isGranted(tab: string | undefined, roles: readonly Role[]): boolean {
  const section = sections.find((candidate) => candidate.id === tab)
  return section?.isGranted(roles) ?? false
}

/**
 * Wraps each screen so one outside the person's sections renders the not-found page
 * instead – the hidden screen never mounts, so it runs no effect and fires no query,
 * and the address is indistinguishable from one that matches nothing.
 * @param routes The merged route table.
 * @returns The same table, every component behind the guard.
 */
function guardScreens<const TRoutes extends Routes>(routes: TRoutes): TRoutes {
  const guarded = Object.entries(routes).map(([path, spec]) => [
    path,
    { ...spec, Component: withGuard(spec) },
  ])
  return Object.fromEntries(guarded) as TRoutes
}

/**
 * The guard around one screen: the real component when the roles grant its section,
 * the not-found page otherwise.
 * @param spec The screen to guard.
 * @returns The guarded component.
 */
function withGuard(spec: ScreenSpec): RouteComponent {
  const Component = spec.Component
  function GuardedScreen(): ReactElement {
    // Ambient below the gate, which always resolves before any screen mounts.
    const roles = useRoles()
    return isGranted(spec.tab, roles) ? <Component /> : <NotFoundRoute />
  }
  return GuardedScreen
}

type AppChromeProps = {
  /**
   * The routed screens the gate stands in front of.
   */
  readonly children: ReactNode
}

type SignedInProps = {
  /**
   * The signed-in person the gate resolved.
   */
  readonly user: User
  /**
   * The routed screens.
   */
  readonly children: ReactNode
}

/**
 * The gate. Every screen sits behind it, so a signed-out visitor sees sign-in whichever
 * address they opened – there is no useful screen without a session. It asks once per
 * page load who is signed in and renders nothing at all until the answer – no spinner,
 * and no flash of the sign-in screen past a signed-in person.
 * @param props The routed screens the gate stands in front of.
 * @returns Nothing until the session is known, then the sign-in screen or the
 * application.
 */
function AppChrome(props: AppChromeProps): ReactElement {
  const [user, setUser] = useState<User>()
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    async function ask(): Promise<void> {
      setUser(await currentUser(queryClient))
      setAsked(true)
    }
    void ask()
  }, [])

  // An empty fragment rather than nothing: the router's InnerWrap must return an
  // element, and rendering none is exactly the gate's contract while it waits.
  if (!asked) {
    return <></>
  }

  if (user === undefined) {
    return (
      <ThemeProvider theme={storedTheme() ?? "blue"}>
        <SignInScreen />
      </ThemeProvider>
    )
  }

  return <SignedInChrome user={user}>{props.children}</SignedInChrome>
}

/**
 * The theme the signed-in person wears: the known unit's color first – the unit is what
 * the application shapes itself around – then the management's red, then whatever this
 * browser wore last time, then the contingent's blue.
 * @param user The signed-in person.
 * @returns The theme to wear.
 */
function themeFor(user: User): Theme {
  if (user.unit !== undefined) {
    return unitTheme(user.unit.number)
  }
  if (hasAnyRole(user.roles, "cmt")) {
    return cmtTheme
  }
  return storedTheme() ?? "blue"
}

/**
 * Everything a signed-in session shows: the keep-alive, the resolved theme, the
 * ambient roles, and the tier's chrome. The roles are mounted here, at the gate,
 * because there is exactly one session; the tier branch is a constant computed before
 * the first render, so chrome belonging to the other tier is never briefly visible.
 * @param props The signed-in user, and the routed screens.
 * @returns The themed, role-aware application.
 */
function SignedInChrome(props: SignedInProps): ReactElement {
  // The auth service's own loop, once per page – an active session refreshes rather
  // than expiring mid-use.
  useEffect(() => {
    keepSessionAlive()
  }, [])

  return (
    <ThemeProvider theme={themeFor(props.user)}>
      <RolesProvider roles={props.user.roles}>
        {host.tier === "shell" ? (
          <ShellChrome user={props.user}>{props.children}</ShellChrome>
        ) : (
          <BrowserChrome user={props.user}>{props.children}</BrowserChrome>
        )}
      </RolesProvider>
    </ThemeProvider>
  )
}

/**
 * The shell tier's chrome, which draws nothing yet: the native bars will replace every
 * visible piece, and the bridge conversation is the shell feature's. The branch lands
 * now so the seam exists and no screen can grow a native-only path by accident.
 * @param props The signed-in user, and the routed screens.
 * @returns The bare content column.
 */
function ShellChrome(props: SignedInProps): ReactElement {
  const title = usePageTitle() ?? ""

  useEffect(() => {
    document.title = title === "" ? "Campfire" : `${title} – Campfire`
  }, [title])

  return (
    <main>
      <div className="content">{props.children}</div>
    </main>
  )
}

/**
 * The back control above a detail page's title: the parent's name, and a history pop so
 * the page returns to where it was left – except on a cold deep link, where there is no
 * history and the parent is navigated to instead. Undefined at a section root, and at a
 * screen reached by a section switch, which is a start however deep its declared parent
 * chain. Not a hook – it reads the trails, never React state.
 * @param parent The address the screen declares above itself.
 * @param roles The signed-in person's roles, for the section labels.
 * @returns The label and the action, or undefined when no back applies.
 */
function backControlFor(
  parent: AppPath | undefined,
  roles: readonly Role[],
): { readonly label: string; readonly onBack: () => void } | undefined {
  if (parent === undefined) {
    return undefined
  }

  const index = historyIndex()

  // The trail is written by an effect after this render, so the switch that has not
  // landed yet is still pending – both readings mean the same screen.
  if (index !== undefined && (rootTrail.has(index) || sectionSwitch.pending)) {
    return undefined
  }

  const isCold = index === 0 || index === undefined

  const onBack = (): void => {
    setNavDirection("back")
    if (isCold) {
      // No click for the capture-phase listener to see, so the push is declared here.
      markPush()
      void router.navigate({ to: parent })
      return
    }
    expectPop()
    router.history.back()
  }

  // The trail knows what the previous entry called itself. Cold – or where the trail
  // is empty – nothing has named the parent, because pages name themselves and the
  // parent has not mounted: a parent that is a section start wears the section's own
  // label, and anything deeper is a plain "back", the way a native bar answers the
  // same ignorance.
  const sectionLabel = sections.find((section) => section.path === parent)?.label(roles)
  const label = isCold ? sectionLabel : (titleTrail.get(index - 1) ?? sectionLabel)

  return { label: label ?? "Tillbaka", onBack }
}

/**
 * What each management function is called, and the order a person holding more than
 * one is named by: the head of contingent leads, then the functions as the role
 * vocabulary lists them. The words are the application's – the role set carries kinds,
 * never labels.
 */
const cmtFunctions: readonly (readonly [Role["kind"], string])[] = [
  ["headOfContingent", "Kontingentledare"],
  ["admin", "Administration"],
  ["communication", "Kommunikation"],
  ["health", "Hälsa"],
  ["istSupport", "IST-support"],
  ["program", "Program"],
  ["unitSupport", "Avdelningssupport"],
]

/**
 * The line under the profile control's name: the role, and the unit or the management
 * function that places them. The leader reading wins when the roles carry both.
 * @param user The signed-in person.
 * @returns The role line.
 */
function roleLineFor(user: User): string {
  if (hasAnyRole(user.roles, "leader")) {
    const unit = user.unit === undefined ? "" : ` · Avdelning ${String(user.unit.number)}`
    return `Ledare${unit}`
  }
  if (hasAnyRole(user.roles, "cmt")) {
    const named = cmtFunctions.find(([kind]) => hasAnyRole(user.roles, kind))
    return named === undefined ? "CMT" : `CMT · ${named[1]}`
  }
  return "Deltagare"
}

/**
 * The browser tier's chrome: the side menu, the condensed bar, the page heading, the
 * content column, the outline, and the tab strip – each snapshotting separately
 * through a view transition, so an unchanged piece holds still while the page slides.
 * @param props The signed-in user, and the routed screens.
 * @returns The whole layout.
 */
function BrowserChrome(props: SignedInProps): ReactElement {
  const user = props.user
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const found = matchScreen(pathname, screens)
  const isGrantedScreen = found !== undefined && isGranted(found.spec.tab, user.roles)

  // The page names itself through PageTitle – the not-found page included, which is
  // what keeps an ungranted address named exactly as one that matches nothing
  // (requirement 4.3): the hidden screen never mounts, so its name never lands.
  const title = usePageTitle() ?? ""

  // The page's declared bar actions, placed per width: the menu on the heading's row
  // on a desktop, in the condensed bar on a phone – both render, the stylesheet picks.
  const declared = usePageActions()

  useEffect(() => {
    document.title = title === "" ? "Campfire" : `${title} – Campfire`
  }, [title])

  useNavigationBookkeeping(pathname, title)

  const back = isGrantedScreen ? backControlFor(found.spec.parent, user.roles) : undefined
  const items: readonly SideMenuItem[] = sections
    .filter((section) => section.isGranted(user.roles))
    .map((section) => ({
      icon: section.icon,
      id: section.id,
      label: section.label(user.roles),
      path: section.path,
    }))
  const currentTab = isGrantedScreen ? found.spec.tab : undefined

  // Both placements render; which one is visible is the stylesheet's breakpoint's
  // decision. Pressing either runs the sign-out round trip, which ends on the sign-in
  // screen – the one way out (requirement 6.5).
  const pill = (isCompact: boolean): ReactElement => (
    <ProfilePill
      compact={isCompact}
      detail={roleLineFor(user)}
      label={`Logga ut ${user.name}`}
      name={user.name}
      onPress={() => {
        signOut(location.origin)
      }}
    />
  )

  return (
    <div className="shell">
      <SideMenu
        items={items}
        current={currentTab}
        onReselect={scrollToTop}
        teaser="Mer kommer snart…"
        footer={pill(false)}
      />
      <div className="page">
        <main>
          <NavigationBar
            title={title}
            trailing={
              <>
                {declared?.menu === undefined ? null : <OverflowMenu items={declared.menu} />}
                {pill(true)}
              </>
            }
          />
          <PageHeading title={title} back={back} action={declared?.action} menu={declared?.menu} />
          <div className="content">{props.children}</div>
        </main>
      </div>
      <Outline key={pathname} title={title} />
      <TabBar items={items} current={currentTab} onReselect={scrollToTop} />
    </div>
  )
}

/**
 * The not-found page: what an address that matches nothing shows, and what an address
 * outside the person's sections shows – identical on purpose, so the application never
 * reveals what exists for other roles. App-level because the URL space's edges belong
 * to no module.
 * @returns The page, inside the layout like any other screen.
 */
function NotFoundRoute(): ReactElement {
  return (
    <>
      <PageTitle title="Sidan finns inte" />
      <Card>
        <p>Sidan du letar efter finns inte.</p>
        <p className="not-found-home">
          <Link to="/">Till startsidan</Link>
        </p>
      </Card>
    </>
  )
}

// Deliberately not annotated: the tree's inferred type is what gives every `Link` and
// `useParams` in the application its checked paths and parameters. Naming it `AnyRoute`
// would typecheck and quietly turn all of that back into `any`.
const routeTree = rootRoute.addChildren(mountRoutes(screens))

/**
 * The application's one router. Every navigation runs as a view transition; which way
 * it animates is the stylesheet's decision, told by the navigation wiring.
 */
export const router = createRouter({
  routeTree,
  InnerWrap: AppChrome,
  defaultViewTransition: true,
  defaultNotFoundComponent: NotFoundRoute,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
