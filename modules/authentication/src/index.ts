/**
 * The authentication module's public surface: the screen anyone who is not signed in
 * lands on, the session client the application's gate asks, the route table holding
 * the profile page, and the doorway the gate hands that page its way out through. The
 * wire shapes, the registration read, and the provider's own spellings stay inside.
 * The `User` the answer decodes to and the role vocabulary are `utils`' to hand out,
 * not this module's – every module may ask who is signed in.
 */

export { currentUser, keepSessionAlive, signOut } from "./data/auth"
export { authenticationRoutes } from "./routes"
export { SignInScreen } from "./ui/screens/SignInScreen/SignInScreen"
export { SignOutProvider } from "./ui/SignOutProvider"
export type { SignOutProviderProps } from "./ui/SignOutProvider"
