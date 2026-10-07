/**
 * The origin a browser reaches the local stack at, which the dev environment's settings
 * below name as localhost. `pnpm start:local --lan` passes this machine's network address
 * instead, because on a phone localhost is the phone, and a sign-in sent back there goes
 * nowhere.
 */
export const origin = process.env["CAMPFIRE_MOCK_ORIGIN"] ?? "http://localhost:8000"

/**
 * The configuration wsj27-auth-api runs with in the dev environment,
 * `config/environments/dev/compose.yaml` – the environment the local one stands in for, so a
 * redirect check, a cookie attribute, or a token lifetime here is the one a developer meets on
 * `pnpm start:dev`. Each comment names the service's own setting.
 */
export const settings: {
  readonly accessTokenTtlSeconds: number
  readonly allowedRedirectDomains: readonly string[]
  readonly audience: string
  readonly insecureCookies: boolean
  readonly oidcClientId: string
  readonly publicUrl: string
} = {
  // ACCESS_TOKEN_TTL_SECONDS, left at the service's default.
  accessTokenTtlSeconds: 300,
  // ALLOWED_REDIRECT_DOMAINS, the hosts login and logout may send a browser back to.
  allowedRedirectDomains: [new URL(origin).host],
  // AUDIENCE, left at the service's default.
  audience: "wsj27",
  // INSECURE_COOKIES, set because the stack is plain http, so no cookie is marked Secure.
  insecureCookies: true,
  // OIDC_CLIENT_ID, the client the service is registered as at ScoutID.
  oidcClientId: "wsj27-auth",
  // PUBLIC_URL, with the one trailing slash the service normalizes it to.
  publicUrl: `${origin}/api/auth/`,
}
