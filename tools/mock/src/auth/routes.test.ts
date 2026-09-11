import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { createApp } from "../app.ts"
import { generateSigningKey } from "../keys.ts"
import { Browser, origin, signIn } from "../testing/browser.ts"
import { clock } from "../testing/clock.ts"

const key = generateSigningKey()
const returnTo = `${origin}/home`

// The cookies a new session sets, in the order the service sets them.
const sessionCookies = [
  "wsj27-auth_access-token",
  "wsj27-auth_refresh-token",
  "wsj27-auth_refresh-expires-at",
  "wsj27-auth_id-token",
  "wsj27-auth_expires-at",
]

// Every cookie the service clears, in the order it clears them.
const everyCookie = [
  "wsj27-auth_access-token",
  "wsj27-auth_refresh-token",
  "wsj27-auth_id-token",
  "wsj27-auth_expires-at",
  "wsj27-auth_refresh-expires-at",
  "wsj27-auth_oidc-code-verifier",
  "wsj27-auth_oidc-state",
  "wsj27-auth_redirect-uri",
]

const missingRedirect =
  '{"detail":[{"type":"missing","loc":["query","redirect_uri"],"msg":"Field required","input":null}]}'

function loginUrl(parameters: Record<string, string> = {}): string {
  return `${origin}/api/auth/login?${new URLSearchParams({ redirect_uri: returnTo, ...parameters }).toString()}`
}

function logoutUrl(redirectUri = returnTo): string {
  return `${origin}/api/auth/logout?${new URLSearchParams({ redirect_uri: redirectUri }).toString()}`
}

function cookieNames(response: Response): string[] {
  return response.headers.getSetCookie().map((cookie) => cookie.slice(0, cookie.indexOf("=")))
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"))
}

function basicAuthorization(credentials: string): Record<string, string> {
  return { Authorization: `Basic ${credentials}` }
}

function setUp(now: () => number = Date.now): {
  app: ReturnType<typeof createApp>
  browser: Browser
} {
  const app = createApp({ key, now })
  return { app, browser: new Browser(app, now) }
}

// A round trip stopped just before the callback: the flow's cookies, and the address ScoutID
// sent the browser back to.
async function pendingCallback(browser: Browser): Promise<{ cookie: string; url: string }> {
  const picker = await browser.navigate(loginUrl())
  const choice = new URL(picker.url).searchParams
  choice.set("email", "program@wsj.se")
  const chosen = await browser.fetch(`${origin}/__mock__/scoutid/choose?${choice.toString()}`)
  const cookie = [
    "wsj27-auth_oidc-code-verifier",
    "wsj27-auth_oidc-state",
    "wsj27-auth_redirect-uri",
  ]
    .map((name) => `${name}=${browser.cookie(name) ?? ""}`)
    .join("; ")
  return { cookie, url: chosen.headers.get("Location") ?? "" }
}

describe("starting a sign-in", () => {
  it("refuses a login with no return address, in FastAPI's own words", async () => {
    const { app } = setUp()

    const response = await app.request(`${origin}/api/auth/login`)

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(missingRedirect)
  })

  it("refuses a return address off the allowlist, a relative one included", async () => {
    const { app } = setUp()

    for (const address of ["/home", "http://localhost:3000/", "https://example.com/"]) {
      const response = await app.request(loginUrl({ redirect_uri: address }))
      expect(response.status).toBe(400)
      expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8")
      expect(await response.text()).toBe("Invalid redirect URI")
    }
  })

  it("sends the browser to ScoutID with PKCE, carrying the round trip in cookies", async () => {
    const { app } = setUp()

    const response = await app.request(loginUrl({ locale: "sv", silent: "true" }))

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get("Location") ?? "")
    expect(`${location.origin}${location.pathname}`).toBe(`${origin}/__mock__/scoutid/auth`)
    expect(location.searchParams.keys().toArray()).toEqual([
      "client_id",
      "response_type",
      "redirect_uri",
      "scope",
      "state",
      "code_challenge",
      "code_challenge_method",
      "prompt",
      "ui_locales",
    ])
    expect(location.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback`)
    expect(location.searchParams.get("scope")).toBe("openid profile email")
    expect(location.searchParams.get("prompt")).toBe("none")

    expect(cookieNames(response)).toEqual([
      "wsj27-auth_oidc-code-verifier",
      "wsj27-auth_oidc-state",
      "wsj27-auth_redirect-uri",
    ])
    const [verifier = "", state = "", redirect = ""] = response.headers.getSetCookie()
    const verifierValue = verifier.slice(verifier.indexOf("=") + 1, verifier.indexOf(";"))
    expect(location.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(verifierValue).digest("base64url"),
    )
    expect(state).toContain("; HttpOnly; Max-Age=1800; Path=/; SameSite=lax")
    expect(redirect).toBe(
      `wsj27-auth_redirect-uri="${returnTo}"; HttpOnly; Max-Age=1800; Path=/; SameSite=lax`,
    )
  })

  it("lands on the stand-in's persona picker", async () => {
    const { browser } = setUp()

    const { response, url } = await browser.navigate(loginUrl())

    expect(response.status).toBe(200)
    expect(new URL(url).pathname).toBe("/__mock__/scoutid/auth")
    const page = await response.text()
    expect(page).toContain("leader-1@wsj.se")
    expect(page).toContain("outsider@wsj.se")
    expect(page).toContain("Ledare i avdelning 1.")
    expect(page).toContain('href="/__mock__/scoutid/choose?')
  })
})

describe("the round trip", () => {
  it("mints the session on the callback in the service's own cookies, and spends the flow's", async () => {
    const { browser } = setUp()

    const landed = await signIn(browser, "leader-1@wsj.se", returnTo)

    expect(landed.status).toBe(302)
    expect(landed.headers.get("Location")).toBe(returnTo)
    expect(cookieNames(landed)).toEqual([
      ...sessionCookies,
      "wsj27-auth_oidc-code-verifier",
      "wsj27-auth_oidc-state",
      "wsj27-auth_redirect-uri",
    ])
    const [access = "", refresh = "", refreshExpires = "", id = "", expires = "", spent = ""] =
      landed.headers.getSetCookie()
    expect(access).toMatch(
      /^wsj27-auth_access-token=[\w-]+\.[\w-]+\.[\w-]+; HttpOnly; Max-Age=300; Path=\/; SameSite=lax$/u,
    )
    expect(refresh).toMatch(/; HttpOnly; Max-Age=1800; Path=\/; SameSite=lax$/u)
    expect(refreshExpires).toMatch(/^wsj27-auth_refresh-expires-at=\d+; HttpOnly; Max-Age=1800;/u)
    expect(id).toMatch(/; HttpOnly; Max-Age=1800; Path=\/; SameSite=lax$/u)
    // The one cookie a script may read.
    expect(expires).toMatch(/^wsj27-auth_expires-at=\d+; Max-Age=300; Path=\/; SameSite=lax$/u)
    expect(spent).toMatch(
      /^wsj27-auth_oidc-code-verifier=""; expires=.+ GMT; HttpOnly; Max-Age=0; Path=\/; SameSite=lax$/u,
    )
  })

  it("reports the signed-in member from /user, with roles minted from their register row", async () => {
    const { browser } = setUp()
    await signIn(browser, "health-grant@wsj.se")

    const response = await browser.fetch(`${origin}/api/auth/user`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      // eslint-disable-next-line no-secrets/no-secrets -- the service's exact body, not a secret
      '{"user":{"name":"Henrik Holm","preferredUsername":"scoutnet|1200002","givenName":"Henrik","familyName":"Holm","email":"health-grant@wsj.se","picture":null,"memberNo":"1200002","roles":["wsj27:access:Hälsa plus intern information","wsj27:cmt:support"]}}',
    )
  })

  it("mints the service's claim shape into its own signed token", async () => {
    const { browser } = setUp()
    await signIn(browser, "health-grant@wsj.se")
    const [header = "", payload = ""] = (browser.cookie("wsj27-auth_access-token") ?? "").split(
      ".",
      2,
    )

    expect(decodeSegment(header)).toEqual({ typ: "JWT", alg: "RS256", kid: key.kid })
    const claims = decodeSegment(payload) as Record<string, unknown> & { exp: number; iat: number }
    expect(Object.keys(claims)).toEqual([
      "iss",
      "aud",
      "iat",
      "nbf",
      "exp",
      "jti",
      "typ",
      "sub",
      "name",
      "preferred_username",
      "given_name",
      "family_name",
      "email",
      "email_verified",
      "member_no",
      "realm_access",
      "resource_access",
    ])
    expect(claims.exp - claims.iat).toBe(300)
    expect(claims).toMatchObject({
      iss: `${origin}/api/auth`,
      aud: "wsj27",
      typ: "Bearer",
      member_no: "1200002",
      realm_access: { roles: [] },
      resource_access: {
        wsj27: { roles: ["cmt:support", "access:Hälsa plus intern information"] },
      },
    })
  })

  it("signs in someone outside the contingent with no roles at all", async () => {
    const { browser } = setUp()
    await signIn(browser, "outsider@wsj.se")

    const response = await browser.fetch(`${origin}/api/auth/user`)

    expect(((await response.json()) as { user: { roles: string[] } }).user.roles).toEqual([])
  })

  it("refuses a code it already spent, and a verifier that does not match the challenge", async () => {
    const { app, browser } = setUp()
    const { cookie, url } = await pendingCallback(browser)

    const first = await app.request(url, { headers: { Cookie: cookie } })
    const again = await app.request(url, { headers: { Cookie: cookie } })

    expect(first.status).toBe(302)
    expect(again.status).toBe(502)
    expect(await again.text()).toBe("Authentication failed")

    // A fresh browser: this one holds ScoutID's session now, which would skip the picker.
    const next = await pendingCallback(new Browser(app))
    const wrongVerifier = next.cookie.replace(
      /oidc-code-verifier=[^;]+/u,
      "oidc-code-verifier=wrong",
    )
    const refused = await app.request(next.url, { headers: { Cookie: wrongVerifier } })
    expect(refused.status).toBe(502)
  })

  it("checks the callback's cookies and parameters in the service's order", async () => {
    const { app, browser } = setUp()
    const { cookie, url } = await pendingCallback(browser)
    const answer = async (address: string, cookies: string): Promise<string> => {
      const response = await app.request(address, { headers: { Cookie: cookies } })
      return response.text()
    }
    const withoutCode = new URL(url)
    withoutCode.searchParams.delete("code")
    const wrongState = new URL(url)
    wrongState.searchParams.set("state", "forged")
    const redirectOnly = cookie.slice(cookie.indexOf("wsj27-auth_redirect-uri"))

    expect(await answer(url, "")).toBe("Invalid redirect URI")
    expect(await answer(`${origin}/api/auth/callback?error=access_denied`, redirectOnly)).toBe(
      "Authentication failed: access_denied",
    )
    expect(await answer(url, redirectOnly)).toBe("Missing code verifier")
    expect(await answer(wrongState.href, cookie)).toBe("Invalid state")
    expect(await answer(withoutCode.href, cookie)).toBe("Missing authorization code")
  })
})

describe("silent sign-in", () => {
  it("comes back signed out, every cookie cleared, when ScoutID has no session", async () => {
    const { browser } = setUp()

    const { response } = await browser.navigate(loginUrl({ silent: "true" }))

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe(returnTo)
    expect(cookieNames(response)).toEqual(everyCookie)
  })

  it("signs straight back in while ScoutID's session lives, and skips the picker on a plain login too", async () => {
    const time = clock()
    const { browser } = setUp(time.now)
    await signIn(browser, "admin@wsj.se")
    time.advance(6 * 60 * 1000)
    expect(browser.cookie("wsj27-auth_access-token")).toBeUndefined()

    const silent = await browser.navigate(loginUrl({ silent: "true" }))
    expect(silent.response.headers.get("Location")).toBe(returnTo)
    expect(cookieNames(silent.response).slice(0, 5)).toEqual(sessionCookies)

    const plain = await browser.navigate(loginUrl())
    expect(plain.response.status).toBe(302)
    const signedIn = await browser.fetch(`${origin}/api/auth/user`)
    expect(signedIn.status).toBe(200)
  })
})

describe("staying signed in", () => {
  it("lets the access cookie lapse after five minutes and re-mints it from the refresh cookie", async () => {
    const time = clock()
    const { browser } = setUp(time.now)
    await signIn(browser, "communication@wsj.se")

    time.advance(5 * 60 * 1000)
    const lapsed = await browser.fetch(`${origin}/api/auth/user`)
    const refreshed = await browser.fetch(`${origin}/api/auth/refresh`)
    const recovered = await browser.fetch(`${origin}/api/auth/user`)

    expect(lapsed.status).toBe(401)
    expect(await lapsed.text()).toBe('{"error":"Unauthorized"}')
    expect(refreshed.status).toBe(200)
    expect(await refreshed.text()).toBe("{}")
    expect(cookieNames(refreshed)).toEqual(sessionCookies)
    expect(recovered.status).toBe(200)
  })

  it("refuses a token that does not verify, and a refresh with no cookie", async () => {
    const { app } = setUp()

    const forged = await app.request(`${origin}/api/auth/user`, {
      headers: { Cookie: "wsj27-auth_access-token=abc.def.ghi" },
    })
    const bare = await app.request(`${origin}/api/auth/refresh`)

    expect(forged.status).toBe(401)
    expect(bare.status).toBe(401)
    expect(await bare.text()).toBe('{"error":"Unauthorized"}')
  })

  it("keeps a session that refreshes going past half an hour", async () => {
    const time = clock()
    const { browser } = setUp(time.now)
    await signIn(browser, "program@wsj.se")

    time.advance(25 * 60 * 1000)
    const first = await browser.fetch(`${origin}/api/auth/refresh`)
    time.advance(25 * 60 * 1000)
    const second = await browser.fetch(`${origin}/api/auth/refresh`)

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
  })

  it("ends the session, clearing every cookie, once ScoutID has forgotten it", async () => {
    const { app, browser } = setUp()
    await signIn(browser, "health@wsj.se")

    await app.request(`${origin}/__mock__/reset`, { method: "POST" })
    const ended = await browser.fetch(`${origin}/api/auth/refresh`)

    expect(ended.status).toBe(401)
    expect(cookieNames(ended)).toEqual(everyCookie)
  })

  it("serves the service's own refresh script, byte for byte", async () => {
    const { app } = setUp()

    const response = await app.request(`${origin}/api/auth/static/refresh.js`)

    expect(response.headers.get("Content-Type")).toBe("application/javascript")
    expect(await response.text()).toBe(
      readFileSync(new URL("../../static/refresh.js", import.meta.url), "utf8"),
    )
  })
})

describe("signing out", () => {
  it("clears every cookie and ends ScoutID's session too, so the next login shows the picker", async () => {
    const { browser } = setUp()
    await signIn(browser, "hoc@wsj.se")

    const response = await browser.fetch(logoutUrl())

    expect(response.status).toBe(302)
    expect(cookieNames(response)).toEqual(everyCookie)
    expect(response.headers.getSetCookie().at(0)).toMatch(
      /^wsj27-auth_access-token=""; expires=\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT; HttpOnly; Max-Age=0; Path=\/; SameSite=lax$/u,
    )
    const location = new URL(response.headers.get("Location") ?? "")
    expect(location.pathname).toBe("/__mock__/scoutid/logout")
    expect(location.searchParams.get("post_logout_redirect_uri")).toBe(returnTo)
    expect(location.searchParams.get("client_id")).toBe("wsj27-auth")

    const ended = await browser.navigate(location.href)
    expect(ended.response.headers.get("Location")).toBe(returnTo)
    const next = await browser.navigate(loginUrl())
    expect(next.response.status).toBe(200)
  })

  it("signs out locally when there is no ScoutID session to end", async () => {
    const { app } = setUp()

    const response = await app.request(logoutUrl())

    expect(response.headers.get("Location")).toBe(returnTo)
    expect(cookieNames(response)).toEqual(everyCookie)
  })

  it("refuses a logout with no return address, and one off the allowlist", async () => {
    const { app } = setUp()

    const missing = await app.request(`${origin}/api/auth/logout`)
    const foreign = await app.request(logoutUrl("https://example.com/"))

    expect(missing.status).toBe(422)
    expect(await missing.text()).toBe(missingRedirect)
    expect(foreign.status).toBe(400)
  })

  it("refuses an end-session request for a session the stand-in never issued", async () => {
    const { app } = setUp()
    const query = new URLSearchParams({
      id_token_hint: "unknown",
      post_logout_redirect_uri: returnTo,
    })

    const response = await app.request(`${origin}/__mock__/scoutid/logout?${query.toString()}`)

    expect(response.status).toBe(400)
  })
})

describe("machine callers", () => {
  it("publishes its key set, and a discovery document describing itself", async () => {
    const { app } = setUp()

    const certs = await app.request(`${origin}/api/auth/certs`)
    const discovery = await app.request(`${origin}/api/auth/.well-known/openid-configuration`)

    expect(await certs.json()).toEqual({ keys: [key.jwk] })
    expect(await discovery.json()).toMatchObject({
      issuer: `${origin}/api/auth`,
      authorization_endpoint: `${origin}/api/auth/login`,
      end_session_endpoint: `${origin}/api/auth/logout`,
      jwks_uri: `${origin}/api/auth/certs`,
    })
  })

  it("refuses every client-credentials request, each as far as it gets", async () => {
    const { app } = setUp()
    const post = async (body: string, headers: Record<string, string> = {}): Promise<Response> =>
      app.request(`${origin}/api/auth/token`, {
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
        method: "POST",
      })

    const empty = await post("")
    expect(empty.status).toBe(422)
    expect(await empty.text()).toBe(
      '{"detail":[{"type":"missing","loc":["body","grant_type"],"msg":"Field required","input":null}]}',
    )

    const password = await post("grant_type=password")
    expect(await password.text()).toBe(
      `{"error":"unsupported_grant_type","error_description":"This endpoint only supports client_credentials, not 'password'."}`,
    )
    const quoted = await post("grant_type=it%27s")
    expect(await quoted.text()).toContain(String.raw`not \"it's\".`)

    const bare = await post("grant_type=client_credentials")
    expect(bare.status).toBe(400)
    expect(await bare.text()).toBe(
      '{"error":"invalid_request","error_description":"Provide client credentials via HTTP Basic auth or the client_id/client_secret fields."}',
    )
    for (const credentials of ["!!!", Buffer.from("no-separator").toString("base64"), "/w=="]) {
      const malformed = await post("grant_type=client_credentials", basicAuthorization(credentials))
      expect(malformed.status).toBe(400)
    }

    for (const refused of [
      await post(
        "grant_type=client_credentials",
        basicAuthorization(Buffer.from("reports:wrong").toString("base64")),
      ),
      await post("grant_type=client_credentials&client_id=reports&client_secret=wrong"),
    ]) {
      expect(refused.status).toBe(401)
      expect(refused.headers.get("WWW-Authenticate")).toBe('Basic realm="wsj27-auth-api"')
      expect(await refused.text()).toBe(
        '{"error":"invalid_client","error_description":"Client authentication failed."}',
      )
    }
  })
})
