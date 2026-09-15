/**
 * The authentication module's public surface: the screen anyone who is not signed in
 * lands on, the session client the application's gate asks, and the signed-in person
 * the answer decodes to, with the helpers that derive from them. The wire shapes, the
 * register read, and the provider's own spellings stay inside. The role vocabulary is
 * `utils`' to hand out, not this module's.
 */

export { currentUser, keepSessionAlive, signOut } from "./data/auth"
export type { Unit } from "./model/Unit"
export type { User } from "./model/User"
export { SignInScreen } from "./ui/screens/SignInScreen/SignInScreen"
