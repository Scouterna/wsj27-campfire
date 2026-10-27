import { hasAnyRole, leaderUnit, useRoles, type Role } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchCaseTypesQuery } from "../data/fetch-case-types"
import { fetchCasesQuery } from "../data/fetch-cases"

/**
 * Whether the held roles reach any kind of case – any role in the management, or a
 * leader's of a numbered unit, since a leader's case type is their own unit's and a bare
 * leader role reaches none. The cases service decides who reaches each case; this says
 * only whether it is worth asking.
 * @param roles The roles to test, usually the signed-in person's.
 * @returns True when the roles carry a case type.
 */
export function hasCaseType(roles: readonly Role[]): boolean {
  return hasAnyRole(roles, "cmt") || leaderUnit(roles) !== undefined
}

/**
 * What the cases service lets the signed-in person do, as Campfire's menus and gates
 * need it.
 */
export interface CasesAccess {
  /**
   * Whether the service offers them a type of case to open.
   */
  readonly canOpen: boolean
  /**
   * Whether the section is theirs – they may open a case, or, where the types could not
   * be read, the service still lists a case for them.
   */
  readonly isGranted: boolean
  /**
   * Whether the service has yet to answer, so neither of the others is known.
   */
  readonly isPending: boolean
}

/**
 * What the cases service lets the signed-in person do, read from its own answers rather
 * than from the roles, so Campfire follows whatever the service decides: the types it
 * offers them, and – only where that read offers none – whether it lists any case for
 * them, as a guard for a types read that failed while the cases can still be read. After
 * a refusal of the types that second read is refused too, because access shared on a case
 * carries no type. A refusal or a failed read is no access. Whoever holds no role that
 * could carry a case type is never asked, since the service refuses them everything.
 *
 * The answers share the cache with the section's own screens, so the section opening
 * afterwards costs no request.
 * @returns The access, and whether it is still being asked about.
 */
export function useCasesAccess(): CasesAccess {
  const isAsked = hasCaseType(useRoles())
  // Not asked again as each guard and menu mounts, because they mount on every
  // navigation – the section's own screens read the same entries and refresh them.
  const types = useQuery({ ...fetchCaseTypesQuery(), enabled: isAsked, refetchOnMount: false })
  const canOpen = (types.data?.length ?? 0) > 0
  // A read the client has paused for want of a network is settled as no answer, so an
  // address in the section is not left blank until the device is online again.
  const isTypesSettled = types.isSuccess || types.isError || types.fetchStatus === "paused"
  const cases = useQuery({
    ...fetchCasesQuery(true),
    enabled: isAsked && isTypesSettled && !canOpen,
    refetchOnMount: false,
  })
  const isCasesSettled = cases.isSuccess || cases.isError || cases.fetchStatus === "paused"
  const isGranted = canOpen || (cases.data?.length ?? 0) > 0
  const isPending = isAsked && (!isTypesSettled || (!canOpen && !isCasesSettled))

  // The same object while nothing changes, because every menu and guard keys on it.
  return useMemo(() => ({ canOpen, isGranted, isPending }), [canOpen, isGranted, isPending])
}
