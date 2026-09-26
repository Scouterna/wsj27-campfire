/**
 * The authentication module's public surface. Beside the route table, the application's
 * gate needs the sign-in screen, the session – asked at boot, then kept alive, watched
 * for its end, and run under every read – and the provider that hands the profile page
 * its way out. The wire shapes, the registration read, and the provider's spellings stay
 * inside. The `User` and the role vocabulary are `utils`' to hand out, because every
 * module may ask who is signed in.
 */

export { currentUser, keepSessionAlive, signOut } from "./data/auth"
export { watchExpiry } from "./data/expiry"
export { subscribeToSession, withSession } from "./data/session"
export { authenticationRoutes } from "./routes"
export { SignInScreen } from "./ui/screens/SignInScreen/SignInScreen"
export { SignOutProvider } from "./ui/SignOutProvider"
export type { SignOutProviderProps } from "./ui/SignOutProvider"
