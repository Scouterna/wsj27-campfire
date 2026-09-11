import { createHash, randomBytes } from "node:crypto"

import type { Claims } from "../claims.ts"
import { settings } from "../settings.ts"
import type { Persona } from "../types.ts"

/**
 * Where the ScoutID stand-in answers – on the origin every environment serves, beside the auth
 * service's public URL.
 */
export const scoutIdUrl = "http://localhost:8000/__mock__/scoutid/"

/**
 * The stand-in's own session cookie, as Keycloak keeps one on its own paths.
 */
export const scoutIdSessionCookie = "mock-scoutid_session"

/**
 * How long a session at the stand-in lives at most, in seconds – Keycloak's default.
 */
export const sessionMaxLifespanSeconds = 10 * 60 * 60

// Keycloak's defaults: a session idles out after half an hour, and a code is good for a minute.
const idleTimeoutMs = 30 * 60 * 1000
const maxLifespanMs = sessionMaxLifespanSeconds * 1000
const codeLifespanMs = 60 * 1000

/**
 * The stand-in refusing a code or a refresh token – Keycloak's `invalid_grant`.
 */
export class InvalidGrant extends Error {}

/**
 * What the stand-in answers a code or a refresh grant with, in the token endpoint's own names.
 */
export interface UpstreamTokens {
  readonly access_token: string
  readonly id_token: string
  /**
   * Seconds until the refresh token expires.
   */
  readonly refresh_expires_in: number
  readonly refresh_token: string
}

/**
 * What an authorization request comes to: the sign-in page, a redirect back with a code or an
 * error, or Keycloak's error page for a request it will not serve.
 */
export type AuthorizationOutcome =
  | { readonly kind: "picker" }
  | { readonly kind: "redirect"; readonly location: string }
  | { readonly kind: "refused"; readonly reason: string }

/**
 * What choosing a persona comes to: a new session and the redirect back with a code, or a
 * refusal.
 */
export type SignInOutcome =
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "signed-in"; readonly location: string; readonly sessionId: string }

interface Session {
  ended: boolean
  readonly id: string
  lastSeenAt: number
  readonly persona: Persona
  readonly startedAt: number
}

interface CodeGrant {
  readonly codeChallenge: string | undefined
  readonly issuedAt: number
  readonly sessionId: string
}

interface RefreshGrant {
  readonly expiresAt: number
  readonly sessionId: string
}

/**
 * The ScoutID stand-in – the one part of the local environment that is not a copy of a real
 * service, because ScoutID is not ours to run. It is shaped like the Keycloak realm it replaces:
 * a session of its own that outlives the auth service's cookies, a one-minute code checked
 * against its PKCE challenge, refresh tokens that die with the session, and an end-session
 * endpoint. Signing in is picking a persona, with no password.
 */
export class ScoutId {
  readonly #claims = new Map<string, Claims>()
  readonly #codes = new Map<string, CodeGrant>()
  readonly #idTokens = new Map<string, string>()
  readonly #now: () => number
  readonly #refreshTokens = new Map<string, RefreshGrant>()
  readonly #sessions = new Map<string, Session>()

  /**
   * @param now The clock, injectable so a test can march a session past its timeouts.
   */
  constructor(now: () => number) {
    this.#now = now
  }

  #activeSession(sessionId: string | undefined): Session | undefined {
    const session = sessionId === undefined ? undefined : this.#sessions.get(sessionId)
    return session !== undefined && this.#isActive(session) ? session : undefined
  }

  #isActive(session: Session): boolean {
    const now = this.#now()
    return (
      !session.ended &&
      now - session.lastSeenAt < idleTimeoutMs &&
      now - session.startedAt < maxLifespanMs
    )
  }

  #issueCode(session: Session, query: Readonly<Record<string, string>>): string {
    const code = randomToken()
    this.#codes.set(code, {
      codeChallenge: query["code_challenge"],
      issuedAt: this.#now(),
      sessionId: session.id,
    })
    const state = query["state"] === undefined ? [] : [["state", query["state"]]]
    return returnAddress(query, [
      ...state,
      ["session_state", session.id],
      ["iss", issuer],
      ["code", code],
    ])
  }

  #issueTokens(session: Session): UpstreamTokens {
    const now = this.#now()
    const tokens = { access: randomToken(), id: randomToken(), refresh: randomToken() }
    const claims = identityOf(session.persona)
    this.#claims.set(tokens.access, claims)
    this.#claims.set(tokens.id, claims)
    this.#idTokens.set(tokens.id, session.id)
    const lifetime = Math.min(idleTimeoutMs, session.startedAt + maxLifespanMs - now)
    this.#refreshTokens.set(tokens.refresh, { expiresAt: now + lifetime, sessionId: session.id })
    return {
      access_token: tokens.access,
      id_token: tokens.id,
      refresh_expires_in: Math.floor(lifetime / 1000),
      refresh_token: tokens.refresh,
    }
  }

  #touch(sessionId: string): Session {
    const session = this.#activeSession(sessionId)
    if (session === undefined) {
      throw new InvalidGrant("Session not active")
    }
    session.lastSeenAt = this.#now()
    return session
  }

  /**
   * Everyone signed in at the stand-in right now, for the control surface.
   * @returns The personas behind every live session.
   */
  activePersonas(): Persona[] {
    return this.#sessions
      .values()
      .filter((session) => this.#isActive(session))
      .map((session) => session.persona)
      .toArray()
  }

  /**
   * Answers an authorization request. A live session goes straight back with a code, without
   * showing anything; a silent request with no session goes back with `login_required`; and
   * anyone else sees the sign-in page.
   * @param query The request's parameters.
   * @param sessionId The stand-in's session cookie, if the browser sent one.
   * @returns What to answer with.
   */
  authorize(
    query: Readonly<Record<string, string>>,
    sessionId: string | undefined,
  ): AuthorizationOutcome {
    const reason = refusalOf(query)
    if (reason !== undefined) {
      return { kind: "refused", reason }
    }
    const session = this.#activeSession(sessionId)
    if (session !== undefined) {
      return { kind: "redirect", location: this.#issueCode(session, query) }
    }
    if (query["prompt"] === "none") {
      const state = query["state"] === undefined ? [] : [["state", query["state"]]]
      const parameters = [["error", "login_required"], ...state, ["iss", issuer]]
      return { kind: "redirect", location: returnAddress(query, parameters) }
    }
    return { kind: "picker" }
  }

  /**
   * The claims behind a token the stand-in issued – what the auth service reads out of it.
   * @param token An access token or an id token.
   * @returns The identity claims, or none for a token the stand-in never issued.
   */
  claimsOf(token: string): Claims {
    return this.#claims.get(token) ?? {}
  }

  /**
   * Ends the session an id token belongs to – the end-session endpoint's work.
   * @param idTokenHint The id token the auth service passed along.
   * @returns Whether the hint named a session the stand-in issued.
   */
  endSession(idTokenHint: string | undefined): boolean {
    const sessionId = idTokenHint === undefined ? undefined : this.#idTokens.get(idTokenHint)
    const session = sessionId === undefined ? undefined : this.#sessions.get(sessionId)
    if (session === undefined) {
      return false
    }
    session.ended = true
    return true
  }

  /**
   * Redeems a code for tokens. A code works once, within a minute, for the verifier whose
   * challenge it was issued against, and only while its session lives.
   * @param code The code the callback received.
   * @param codeVerifier The PKCE verifier the auth service kept.
   * @returns The tokens.
   */
  exchangeCode(code: string, codeVerifier: string): UpstreamTokens {
    const grant = this.#codes.get(code)
    this.#codes.delete(code)
    if (grant === undefined || grant.issuedAt + codeLifespanMs <= this.#now()) {
      throw new InvalidGrant("Code not valid")
    }
    if (grant.codeChallenge !== undefined && grant.codeChallenge !== challengeOf(codeVerifier)) {
      throw new InvalidGrant("PKCE verification failed")
    }
    return this.#issueTokens(this.#touch(grant.sessionId))
  }

  /**
   * Redeems a refresh token for fresh tokens, keeping the session alive.
   * @param refreshToken The refresh token from the auth service's cookie.
   * @returns The tokens.
   */
  refresh(refreshToken: string): UpstreamTokens {
    const grant = this.#refreshTokens.get(refreshToken)
    if (grant === undefined || grant.expiresAt <= this.#now()) {
      throw new InvalidGrant("Token is not active")
    }
    return this.#issueTokens(this.#touch(grant.sessionId))
  }

  /**
   * Forgets every session, code, and token – the control surface's reset.
   */
  reset(): void {
    this.#claims.clear()
    this.#codes.clear()
    this.#idTokens.clear()
    this.#refreshTokens.clear()
    this.#sessions.clear()
  }

  /**
   * Signs a persona in from the picker: a new session, and the redirect back with a code.
   * @param persona Who was picked.
   * @param query The authorization request the picker was shown for.
   * @returns The session and the redirect, or a refusal.
   */
  signIn(persona: Persona, query: Readonly<Record<string, string>>): SignInOutcome {
    const reason = refusalOf(query)
    if (reason !== undefined) {
      return { kind: "refused", reason }
    }
    const now = this.#now()
    const session: Session = {
      ended: false,
      id: randomToken(),
      lastSeenAt: now,
      persona,
      startedAt: now,
    }
    this.#sessions.set(session.id, session)
    return { kind: "signed-in", location: this.#issueCode(session, query), sessionId: session.id }
  }
}

// The realm's issuer, which Keycloak adds to every redirect back.
const issuer = scoutIdUrl.slice(0, -1)

// Keycloak's error page for a request from a client it does not know, or for a return address
// that client did not register.
function refusalOf(query: Readonly<Record<string, string>>): string | undefined {
  if (query["client_id"] !== settings.oidcClientId) {
    return "Client not found."
  }
  if (query["redirect_uri"] !== `${settings.publicUrl}callback`) {
    return "Invalid parameter: redirect_uri"
  }
  return query["response_type"] === "code" ? undefined : "Invalid parameter: response_type"
}

function returnAddress(
  query: Readonly<Record<string, string>>,
  parameters: readonly (readonly string[])[],
): string {
  const search = new URLSearchParams(parameters.map(([name = "", value = ""]) => [name, value]))
  return `${query["redirect_uri"] ?? ""}?${search.toString()}`
}

// The identity claims ScoutID reports for an account. The subject is a stable UUID-shaped id
// derived from the member number, as Keycloak's is a UUID that never changes.
function identityOf(persona: Persona): Claims {
  const digest = createHash("sha256").update(persona.memberNo).digest("hex")
  const subject = [
    digest.slice(0, 8),
    digest.slice(8, 12),
    digest.slice(12, 16),
    digest.slice(16, 20),
    digest.slice(20, 32),
  ].join("-")
  return {
    sub: subject,
    name: `${persona.givenName} ${persona.familyName}`,
    preferred_username: `scoutnet|${persona.memberNo}`,
    given_name: persona.givenName,
    family_name: persona.familyName,
    email: persona.email,
    email_verified: true,
    scoutnet_member_no: persona.memberNo,
  }
}

function challengeOf(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url")
}

function randomToken(): string {
  return randomBytes(32).toString("base64url")
}
