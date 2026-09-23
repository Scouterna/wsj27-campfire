/**
 * The authentication module's public surface: the screen anyone who is not signed in
 * lands on, the session client the application's gate asks, the three doorways the
 * session opens after boot – `withSession` for the query client to run every read
 * under, `subscribeToSession` for the gate to hear the session end or change owner,
 * and `watchExpiry` for the gate to start beside the service's keep-alive – the route
 * table holding the profile page, and the doorway the gate hands that page its way out
 * through. The wire shapes, the registration read, the session store's own state, and
 * the provider's own spellings stay inside. The `User` the answer decodes to and the
 * role vocabulary are `utils`' to hand out, not this module's – every module may ask
 * who is signed in.
 */

export { currentUser, keepSessionAlive, signOut } from "./data/auth"
export { watchExpiry } from "./data/expiry"
export { subscribeToSession, withSession } from "./data/session"
export { authenticationRoutes } from "./routes"
export { SignInScreen } from "./ui/screens/SignInScreen/SignInScreen"
export { SignOutProvider } from "./ui/SignOutProvider"
export type { SignOutProviderProps } from "./ui/SignOutProvider"
