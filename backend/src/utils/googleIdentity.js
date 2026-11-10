import { createPublicKey } from "node:crypto";

import jwt from "jsonwebtoken";

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const CERTS_TTL_MS = 60 * 60 * 1000;

let cachedKeys = [];
let cachedAt = 0;

async function signingKey(keyId, fetchImpl, now) {
  let key = cachedKeys.find((item) => item.kid === keyId);

  // Google rotates keys, so an unknown key ID also triggers a refresh.
  if (!key || now() - cachedAt > CERTS_TTL_MS) {
    const response = await fetchImpl(CERTS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error("Google signing keys are unavailable");
    }

    cachedKeys = (await response.json()).keys;
    cachedAt = now();
    key = cachedKeys.find((item) => item.kid === keyId);
  }

  if (!key) {
    throw new Error("Unknown Google signing key");
  }
  return createPublicKey({ key, format: "jwk" });
}

// Checks a Google ID token's signature, audience, issuer, and expiry, and returns
// the account it names. Throws when any check fails.
export async function verifyGoogleCredential(credential, {
  clientId = process.env.GOOGLE_CLIENT_ID,
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  const keyId = jwt.decode(credential, { complete: true })?.header?.kid;
  if (!keyId) {
    throw new Error("Malformed Google credential");
  }

  const payload = jwt.verify(credential, await signingKey(keyId, fetchImpl, now), {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: ISSUERS,
    clockTimestamp: Math.floor(now() / 1000),
  });

  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google account has no verified email");
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    displayName: typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : undefined,
  };
}
