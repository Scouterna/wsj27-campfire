/**
 * The utilities more than one package needs: the small, pure helpers that would
 * otherwise be copied, and the ambient session that lets any module ask what roles are
 * in force and who is signed in.
 *
 * The bar for adding something is that a second package already wants it. A helper with
 * one caller belongs beside that caller, where it can change without a release.
 */

export { HttpError, fetch } from "./networking/networking"
export { hasAllRoles, hasAnyRole, leaderUnit } from "./roles/roles"
export type { Role } from "./roles/roles"
export { RolesProvider, useRoles } from "./roles/RolesProvider"
export type { RolesProviderProps } from "./roles/RolesProvider"
export { stringOrFallback } from "./string/string"
export type { Travel, Unit, User, UserMark } from "./user/user"
export { UserProvider, useUser } from "./user/UserProvider"
export type { UserProviderProps } from "./user/UserProvider"
