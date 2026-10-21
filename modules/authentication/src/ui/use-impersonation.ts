import { hasAnyRole, useUser } from "@scouterna/wsj27-campfire-utils"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"

import { signBackInUrl } from "../data/auth"
import {
  fetchImpersonationOfferQuery,
  fetchImpersonationTargetsQuery,
  forgetImpersonation,
  impersonate,
  ImpersonationError,
  isImpersonating,
  rememberImpersonation,
  type ImpersonationFailure,
} from "../data/impersonation"
import type { ImpersonationTarget } from "../model/ImpersonationTarget"
import { useSignOut } from "./SignOutProvider"

// Constructed once, because a collator is expensive to build and every target is sorted
// with it.
const swedish = new Intl.Collator("sv")

/**
 * Whether the signed-in person is offered to be shown Campfire as somebody else. Only a
 * member of the contingent management is, because only they may read the people there
 * are to choose from, and nobody already shown it as somebody else is, because the way
 * back is what they need. Whether the auth service offers it at all is its own answer,
 * asked only for somebody who could be offered it.
 * @returns True when offered, false when not, and undefined while the service's answer
 * is on its way.
 */
export function useImpersonationOffer(): boolean | undefined {
  const user = useUser()
  const isEligible =
    user !== undefined && hasAnyRole(user.roles, "cmt") && !isImpersonating(user.memberNo)
  const { data, isError } = useQuery({ ...fetchImpersonationOfferQuery(), enabled: isEligible })
  if (!isEligible || isError) {
    return false
  }
  return data
}

/**
 * Whether the session signed in now is one this page made another member's.
 * @returns True while showing Campfire as somebody else.
 */
export function useIsImpersonating(): boolean {
  const user = useUser()
  return user !== undefined && isImpersonating(user.memberNo)
}

/**
 * The people the picker offers, and the states that are not an answer.
 */
export interface ImpersonationTargetsView {
  /**
   * Why the people could not be read, or null while they can be.
   */
  readonly error: Error | null
  /**
   * Whether the people are still on their way.
   */
  readonly isPending: boolean
  /**
   * Asks for the people again, for the control a failed read offers.
   */
  readonly refetch: () => void
  /**
   * Everybody who may be chosen, alphabetically, the signed-in person left out.
   */
  readonly targets: readonly ImpersonationTarget[]
}

/**
 * Everybody the signed-in person may be shown Campfire as.
 * @param isOffered Whether impersonation is offered, so nothing is read where it is not,
 * and nobody is offered there either.
 * @returns The people, and the states around them.
 */
export function useImpersonationTargets(isOffered: boolean): ImpersonationTargetsView {
  const user = useUser()
  const query = useQuery({ ...fetchImpersonationTargetsQuery(), enabled: isOffered })
  const { error, isPending, refetch } = query
  // A disabled query still answers from the cache, so a list read while impersonation was
  // offered would outlive the offer.
  const data = isOffered ? query.data : undefined

  const targets = useMemo(
    () =>
      (data ?? [])
        .filter((target) => target.memberNo !== user?.memberNo)
        .toSorted((left, right) => swedish.compare(left.name, right.name)),
    [data, user?.memberNo],
  )

  const again = useCallback(() => {
    void refetch()
  }, [refetch])

  return {
    // eslint-disable-next-line unicorn/no-null -- the view keeps TanStack Query's `Error | null`
    error: data === undefined ? error : null,
    isPending: isOffered && isPending,
    refetch: again,
    targets,
  }
}

/**
 * Why becoming the chosen member did not happen – the service's refusal, or a session
 * the service replaced with one this module cannot read, which leaves only the way back.
 */
export type ImpersonateFailure = ImpersonationFailure | "unreadable"

/**
 * What the confirmation needs: the way to become somebody, and how that is going.
 */
export interface ImpersonateView {
  /**
   * Why the last attempt failed, or undefined when it has not.
   */
  readonly failure: ImpersonateFailure | undefined
  /**
   * Becomes the member, then loads the application again as them, from its start.
   */
  readonly impersonate: (memberNo: string) => void
  /**
   * Whether an attempt is under way, or succeeded and the page is leaving.
   */
  readonly isPending: boolean
}

/**
 * Becoming another member. The page is loaded again from its start once the session is
 * theirs, rather than carrying on, because everything it holds is the caller's – the
 * boot hands the cache to the new member number, which forgets the caller's, and the
 * start screen is where the member themselves would land.
 * @returns The way to become somebody, and how that is going.
 */
export function useImpersonate(): ImpersonateView {
  const [isLeaving, setIsLeaving] = useState(false)
  const [isUnreadable, setIsUnreadable] = useState(false)
  const { error, isPending, mutate } = useMutation({ mutationFn: impersonate })

  const become = useCallback(
    (memberNo: string): void => {
      setIsUnreadable(false)
      mutate(memberNo, {
        onSuccess: (user) => {
          if (user === undefined) {
            setIsUnreadable(true)
            return
          }
          rememberImpersonation(user.memberNo)
          setIsLeaving(true)
          location.assign("/")
        },
      })
    },
    [mutate],
  )

  let failure: ImpersonateFailure | undefined
  if (isUnreadable) {
    failure = "unreadable"
  } else if (error !== null) {
    failure = error instanceof ImpersonationError ? error.failure : "failed"
  }

  return { failure, impersonate: become, isPending: isPending || isLeaving }
}

/**
 * The way back to the person's own account: out of the impersonated session and straight
 * back in through ScoutID's, which the impersonation left open, onto the profile page.
 * @returns What takes the way back.
 */
export function useWayBack(): () => void {
  const signOut = useSignOut()
  return useCallback(() => {
    forgetImpersonation()
    signOut(signBackInUrl(`${location.origin}/profile`))
  }, [signOut])
}
