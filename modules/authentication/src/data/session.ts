import { fetch, HttpError, type User } from "@scouterna/wsj27-campfire-utils"

import { decodeUser } from "./dto/UserDto"

/**
 * The session as the application sees it: one ask at a time, the last answer, and who
 * wants to know when it changes. The state is the module's own, as `injected` is in
 * `auth.ts` – a page has one session, and every read under it is checked against the
 * same answer.
 */

/**
 * What the last ask settled on.
 */
export type SessionState =
  | { readonly kind: "nobody" }
  | { readonly kind: "somebody"; readonly user: User }
  | { readonly kind: "unknown" }

/**
 * What one identity ask found. Only the service saying no is `nobody`.
 */
export type Answer =
  | { readonly kind: "nobody" }
  | { readonly kind: "somebody"; readonly user: User }
  | { readonly kind: "unreachable" }

/**
 * A change in who is signed in, after there was somebody.
 */
export type SessionChange =
  { readonly kind: "changed"; readonly user: User } | { readonly kind: "ended" }

/**
 * The store. `inFlight` is the ask every caller joins while it runs; `state` changes only
 * when an ask settles on an answer from the service.
 */
const store: {
  inFlight: Promise<Answer> | undefined
  readonly listeners: Set<(change: SessionChange) => void>
  state: SessionState
} = { inFlight: undefined, listeners: new Set(), state: { kind: "unknown" } }

/**
 * Asks the auth service who is signed in – one ask at a time; a caller while one is in
 * flight gets that ask's promise. Records a `nobody` or `somebody` answer, and notifies
 * subscribers when it differs from the last: nobody, or a different member number. An
 * `unreachable` answer records nothing and notifies nobody.
 * @returns What the ask settled on.
 */
export function askAgain(): Promise<Answer> {
  if (store.inFlight !== undefined) {
    return store.inFlight
  }

  // Recording and notifying happen inside the ask, before the promise every joiner holds
  // resolves – so the subscribers have acted on an ended session before any caller's
  // await resumes and decides what to do with the answer.
  const ask = (async () => {
    const answer = await identity()
    store.inFlight = undefined
    settle(answer)
    return answer
  })()
  store.inFlight = ask

  return ask
}

/**
 * What the store last settled on – `unknown` until the first ask answers.
 * @returns The last recorded state.
 */
export function sessionState(): SessionState {
  return store.state
}

/**
 * Subscribes to changes after somebody was signed in.
 * @param listener Called with each change, synchronously as the ask that found it
 * settles.
 * @returns The unsubscribe.
 */
export function subscribeToSession(listener: (change: SessionChange) => void): () => void {
  // Wrapped, so the same function subscribed twice is two subscriptions and each
  // unsubscribe removes only its own.
  const entry = (change: SessionChange): void => {
    listener(change)
  }
  store.listeners.add(entry)

  return () => {
    store.listeners.delete(entry)
  }
}

/**
 * Runs a read under the session. A refusal (401) asks again; the same person still
 * signed in runs the read once more, and any other answer rethrows. Rejects without
 * reading once the session has ended.
 * @param read The read to run – a query function, usually.
 * @returns What the read resolved with.
 */
export async function withSession<T>(read: () => Promise<T>): Promise<T> {
  const before = store.state
  if (before.kind === "unknown") {
    // No ask has answered – Storybook, a test client. There is no session to check
    // against, so the read stands alone and a refusal is simply its error.
    return read()
  }
  if (before.kind === "nobody") {
    throw new Error("The session has ended")
  }

  const memberNo = before.user.memberNo
  let value: T
  try {
    value = await read()
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 401) {
      throw error
    }
    const answer = await askAgain()
    if (answer.kind !== "somebody" || answer.user.memberNo !== memberNo) {
      throw error
    }
    // Once more and no further: a refusal here rethrows without asking again, and the
    // query client's own single retry is the bound.
    value = await read()
  }

  // The session can end while the read is in flight. Whatever resolves here is written
  // into the store the gate just cleared, so a late answer is refused instead.
  if (store.state.kind === "nobody") {
    throw new Error("The session ended while the read was in flight")
  }

  return value
}

/**
 * One identity ask: `/api/auth/user`, and on a refusal one `/api/auth/refresh` round trip
 * to re-mint the short-lived token and the question once more. Only the service saying
 * no – the refresh refused, or the second question refused – is nobody. A network
 * failure, another status, a body that is not JSON, and a payload that is not a user are
 * all unreachable: nothing was said about the session. The last two are real – with no
 * auth service behind this origin, a bare dev server answers the application's own HTML.
 * @returns What the ask found.
 */
async function identity(): Promise<Answer> {
  try {
    return await askUser()
  } catch (error) {
    if (!isRefusal(error)) {
      return { kind: "unreachable" }
    }
  }

  try {
    await fetch("/api/auth/refresh")
    return await askUser()
  } catch (error) {
    return isRefusal(error) ? { kind: "nobody" } : { kind: "unreachable" }
  }
}

/**
 * One question to `/api/auth/user`, decoded.
 * @returns Somebody, or unreachable when the payload is not a user.
 */
async function askUser(): Promise<Answer> {
  const user = decodeUser(await fetch("/api/auth/user"))
  return user === undefined ? { kind: "unreachable" } : { kind: "somebody", user }
}

/**
 * Whether an error is the service refusing the session.
 * @param error What a request threw.
 * @returns True for an `HttpError` 401.
 */
function isRefusal(error: unknown): boolean {
  return error instanceof HttpError && error.status === 401
}

/**
 * Records an answer and tells the subscribers what changed. Only a change after somebody
 * was signed in is news: the first answer, and nobody after nobody, are the gate's own
 * boot to act on.
 * @param answer What the ask settled on.
 */
function settle(answer: Answer): void {
  if (answer.kind === "unreachable") {
    return
  }
  const previous = store.state
  store.state = answer
  if (previous.kind !== "somebody") {
    return
  }

  if (answer.kind === "nobody") {
    notify({ kind: "ended" })
  } else if (answer.user.memberNo !== previous.user.memberNo) {
    notify({ kind: "changed", user: answer.user })
  }
}

/**
 * Hands a change to every subscriber.
 * @param change The change to hand on.
 */
function notify(change: SessionChange): void {
  for (const listener of store.listeners) {
    try {
      listener(change)
    } catch (error) {
      // A throwing subscriber is a bug worth seeing, but not one that may keep the
      // others from hearing that the session ended, or fail the ask every refused read
      // is waiting on. Rethrown on its own turn, where it reaches the console as an
      // uncaught error.
      queueMicrotask(() => {
        throw error
      })
    }
  }
}
