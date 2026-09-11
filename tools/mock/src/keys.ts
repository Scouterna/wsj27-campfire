import { createHash, generateKeyPairSync, type KeyObject } from "node:crypto"

/**
 * The RSA key the auth service signs its access tokens with, and the JSON Web Key it publishes
 * for verifying them. The real service reads its key from a secret; the mock makes one when it
 * starts, so a restart invalidates every token it minted – as rotating the secret would.
 */
export interface SigningKey {
  /**
   * The public half as a JSON Web Key, in the member order the service's `/certs` sends.
   */
  readonly jwk: Readonly<Record<string, string>>
  /**
   * The key id: the public key's RFC 7638 thumbprint, which is how joserfc names a key.
   */
  readonly kid: string
  readonly privateKey: KeyObject
  readonly publicKey: KeyObject
}

/**
 * Generates a fresh 2048-bit RSA signing key.
 * @returns The key, its id, and its published form.
 */
export function generateSigningKey(): SigningKey {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const { e, kty, n } = publicKey.export({ format: "jwk" })
  if (e === undefined || kty === undefined || n === undefined) {
    throw new Error("An RSA public key exported without its parameters")
  }
  // RFC 7638: the required members in lexicographic order, with no whitespace.
  const kid = createHash("sha256").update(JSON.stringify({ e, kty, n })).digest("base64url")
  return {
    jwk: { n, e, kty, kid, use: "sig", alg: "RS256" },
    kid,
    privateKey,
    publicKey,
  }
}
