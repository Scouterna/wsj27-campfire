import {
  currentUser,
  keepSessionAlive,
  SignInScreen,
  signOut,
  type User,
} from "@scouterna/wsj27-campfire-authentication"
import { HomeScreen } from "@scouterna/wsj27-campfire-home"
import {
  cmtTheme,
  storedTheme,
  ThemeProvider,
  unitTheme,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, RolesProvider } from "@scouterna/wsj27-campfire-utils"
import { useEffect, useState, type ReactElement } from "react"

import { queryClient } from "./query"

/**
 * The session gate. It asks once per page load who is signed in and renders nothing at
 * all until the answer – no spinner, and no flash of the sign-in screen past a signed-in
 * person. Nobody signed in is the sign-in screen in the remembered theme; somebody is
 * the signed-in application. If anything below this component renders, somebody is
 * signed in.
 *
 * @returns Nothing until the session is known, then the sign-in screen or the
 * application.
 */
export function RequireSession(): ReactElement | undefined {
  const [user, setUser] = useState<User>()
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    async function ask(): Promise<void> {
      setUser(await currentUser(queryClient))
      setAsked(true)
    }
    void ask()
  }, [])

  if (!asked) {
    return undefined
  }

  if (user === undefined) {
    return (
      <ThemeProvider theme={storedTheme() ?? "blue"}>
        <SignInScreen />
      </ThemeProvider>
    )
  }

  return <SignedInApp user={user} />
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

type SignedInAppProps = {
  /**
   * The signed-in user the gate resolved.
   */
  readonly user: User
}

/**
 * Everything a signed-in session shows: the keep-alive, the resolved theme, the ambient
 * roles, and – for now – the greeting page. The roles are mounted here, at the gate,
 * because there is exactly one session: every future screen below reads them with the
 * helpers instead of having answers threaded down as props.
 * @param props The signed-in user.
 * @returns The themed, role-aware application.
 */
function SignedInApp(props: SignedInAppProps): ReactElement {
  // The auth service's own loop, once per page – an active session refreshes rather
  // than expiring mid-use.
  useEffect(() => {
    keepSessionAlive()
  }, [])

  // Sign-out returns to the origin, which boots signed out onto the sign-in screen –
  // the address belongs to authentication, so home is only handed the behavior.
  return (
    <ThemeProvider theme={themeFor(props.user)}>
      <RolesProvider roles={props.user.roles}>
        <HomeScreen
          firstName={props.user.firstName}
          onSignOut={() => {
            signOut(location.origin)
          }}
        />
      </RolesProvider>
    </ThemeProvider>
  )
}
