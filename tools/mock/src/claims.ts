import { byCodePoint, field, isRecord } from "./json.ts"

/**
 * A token's claims, decoded.
 */
export type Claims = Readonly<Record<string, unknown>>

/**
 * Splits roles into Keycloak's claim shape, as the auth service writes them into a token: a
 * role with a colon is a client role under `resource_access`, split on the first colon only,
 * so `wsj27:al:1` becomes client `wsj27` holding `al:1`; anything else is a realm role.
 * @param roles The roles to carry.
 * @returns `realm_access`, and `resource_access` when any role is a client role.
 */
export function roleClaims(roles: readonly string[]): Record<string, unknown> {
  const realmRoles: string[] = []
  const resourceRoles = new Map<string, string[]>()
  for (const role of roles) {
    const separator = role.indexOf(":")
    const client = separator === -1 ? "" : role.slice(0, separator)
    const name = separator === -1 ? "" : role.slice(separator + 1)
    if (client !== "" && name !== "") {
      resourceRoles.set(client, [...(resourceRoles.get(client) ?? []), name])
    } else {
      realmRoles.push(role)
    }
  }
  const claims: Record<string, unknown> = { realm_access: { roles: realmRoles } }
  if (resourceRoles.size > 0) {
    claims["resource_access"] = Object.fromEntries(
      resourceRoles.entries().map(([client, names]) => [client, { roles: names }]),
    )
  }
  return claims
}

/**
 * Flattens a token's role claims back into one list – realm roles bare, client roles as
 * `client:role` – deduplicated and sorted. Both services carry this same function, the auth
 * service for `/user` and the project API for every request it authorizes.
 * @param claims The token's claims.
 * @returns The roles, sorted.
 */
export function extractRoles(claims: Claims): string[] {
  const realmRoles = stringsIn(field(field(claims, "realm_access"), "roles"))
  const resourceAccess = field(claims, "resource_access")
  const clientRoles = isRecord(resourceAccess)
    ? Object.entries(resourceAccess).flatMap(([client, resource]) =>
        stringsIn(field(resource, "roles")).map((role) => `${client}:${role}`),
      )
    : []
  return new Set([...realmRoles, ...clientRoles]).values().toArray().toSorted(byCodePoint)
}

function stringsIn(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
