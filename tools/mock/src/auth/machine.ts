import { Buffer } from "node:buffer"

import type { Context } from "hono"

import { missingError, validationFailed } from "../fastapi.ts"
import { field } from "../json.ts"
import type { SigningKey } from "../keys.ts"
import { settings } from "../settings.ts"
import { issuer } from "./tokens.ts"

/**
 * The auth service's routes for machines rather than browsers: the client-credentials token
 * endpoint, the signing keys, and the discovery document that points at both.
 */

function oauthError(
  context: Context,
  error: string,
  description: string,
  status: 400 | 401,
): Response {
  if (status === 401) {
    context.header("WWW-Authenticate", 'Basic realm="wsj27-auth-api"')
  }
  return context.json({ error, error_description: description }, status)
}

// Python's repr of a string, which is how the service quotes a grant type it refuses.
function pythonRepr(value: string): string {
  const escaped = value.replaceAll("\\", "\\\\")
  if (value.includes("'") && !value.includes('"')) {
    return `"${escaped}"`
  }
  const singleQuoted = escaped.replaceAll("'", String.raw`\'`)
  return `'${singleQuoted}'`
}

// Credentials from an HTTP Basic header, decoded as strictly as base64.b64decode(validate=True)
// decodes them.
function hasBasicCredentials(header: string | undefined): boolean {
  if (header?.startsWith("Basic ") !== true) {
    return false
  }
  const encoded = header.slice("Basic ".length)
  if (encoded.length % 4 !== 0 || !/^[\d+/A-Za-z]*={0,2}$/u.test(encoded)) {
    return false
  }
  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(Buffer.from(encoded, "base64"))
      .includes(":")
  } catch {
    return false
  }
}

/**
 * `POST /token` – the client-credentials grant. The environment this stands in for configures
 * no `SERVICE_CLIENT_SECRETS`, so every client that gets as far as authenticating is refused;
 * what differs is how far a request gets.
 * @param context The request.
 * @returns The refusal.
 */
export async function token(context: Context): Promise<Response> {
  const form = await context.req.parseBody()
  const text = (name: string): string => {
    const value = field(form, name)
    return typeof value === "string" ? value : ""
  }
  // A Form field sent empty is a missing one to FastAPI.
  const grantType = text("grant_type")
  if (grantType === "") {
    return validationFailed(context, [missingError(["body", "grant_type"])])
  }
  if (grantType !== "client_credentials") {
    const description = `This endpoint only supports client_credentials, not ${pythonRepr(grantType)}.`
    return oauthError(context, "unsupported_grant_type", description, 400)
  }
  const hasBasic = hasBasicCredentials(context.req.header("Authorization"))
  if (!hasBasic && (text("client_id") === "" || text("client_secret") === "")) {
    const description =
      "Provide client credentials via HTTP Basic auth or the client_id/client_secret fields."
    return oauthError(context, "invalid_request", description, 400)
  }
  return oauthError(context, "invalid_client", "Client authentication failed.", 401)
}

/**
 * `GET /certs` – the key set access tokens are signed with.
 * @param context The request.
 * @param key The signing key.
 * @returns The JSON Web Key Set.
 */
export function certs(context: Context, key: SigningKey): Response {
  return context.json({ keys: [key.jwk] })
}

/**
 * `GET /.well-known/openid-configuration` – the service's own discovery document, describing its
 * endpoints and its keys rather than ScoutID's.
 * @param context The request.
 * @returns The discovery document.
 */
export function discoveryDocument(context: Context): Response {
  const base = settings.publicUrl
  return context.json({
    issuer,
    authorization_endpoint: `${base}login`,
    token_endpoint: `${base}token`,
    end_session_endpoint: `${base}logout`,
    userinfo_endpoint: `${base}user`,
    jwks_uri: `${base}certs`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token", "client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "iat",
      "name",
      "preferred_username",
      "given_name",
      "family_name",
      "email",
      "picture",
      "member_no",
      "realm_access",
      "resource_access",
    ],
    code_challenge_methods_supported: ["S256"],
  })
}
