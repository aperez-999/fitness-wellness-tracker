import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import jwt from "jsonwebtoken";

import { verifyGoogleCredential } from "../src/utils/googleIdentity.js";

const clientId = "test-client.apps.googleusercontent.com";
const google = generateKeyPairSync("rsa", { modulusLength: 2048 });
const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });
const keys = [{ ...google.publicKey.export({ format: "jwk" }), kid: "google-key", alg: "RS256", use: "sig" }];

let certRequests = 0;
const fetchImpl = async () => {
  certRequests += 1;
  return { ok: true, json: async () => ({ keys }) };
};

function credential(claims = {}, { key = google.privateKey, kid = "google-key", ...options } = {}) {
  return jwt.sign(
    { email: "Alex@Example.test", email_verified: true, name: "Alex Morgan", ...claims },
    key,
    {
      algorithm: "RS256",
      keyid: kid,
      audience: clientId,
      issuer: "https://accounts.google.com",
      subject: "google-user-1",
      expiresIn: "1h",
      ...options,
    },
  );
}

const verify = (token) => verifyGoogleCredential(token, { clientId, fetchImpl });

test("a valid Google credential returns the account and reuses the signing keys", async () => {
  assert.deepEqual(await verify(credential()), {
    googleId: "google-user-1",
    email: "alex@example.test",
    displayName: "Alex Morgan",
  });

  await verify(credential({}, { issuer: "accounts.google.com" }));
  assert.equal(certRequests, 1);
});

test("credentials that are forged, expired, or meant for someone else are rejected", async () => {
  const rejected = {
    "another app's client ID": credential({}, { audience: "other-client.apps.googleusercontent.com" }),
    "another issuer": credential({}, { issuer: "https://accounts.example.test" }),
    "an expired token": credential({}, { expiresIn: "-1m" }),
    "an attacker's key": credential({}, { key: attacker.privateKey }),
    "an unknown key ID": credential({}, { kid: "unknown-key" }),
    "an unverified email": credential({ email_verified: false }),
    "a missing email": credential({ email: undefined }),
    "an HMAC token signed with the public key": jwt.sign(
      { email: "alex@example.test", email_verified: true },
      google.publicKey.export({ type: "spki", format: "pem" }),
      { algorithm: "HS256", keyid: "google-key", audience: clientId, issuer: "accounts.google.com", subject: "x", allowInsecureKeySizes: true },
    ),
    "an unsigned token": `${Buffer.from('{"alg":"none","kid":"google-key"}').toString("base64url")}.${Buffer.from('{"sub":"x"}').toString("base64url")}.`,
    "text that is not a token": "not-a-token",
  };

  for (const [label, token] of Object.entries(rejected)) {
    await assert.rejects(verify(token), undefined, `${label} must be rejected`);
  }
});

test("unreachable Google signing keys fail closed", async () => {
  const offline = async () => ({ ok: false, status: 503 });
  const later = () => Date.now() + 2 * 60 * 60 * 1000;

  await assert.rejects(verifyGoogleCredential(credential({}, { expiresIn: "3h" }), { clientId, fetchImpl: offline, now: later }));
});
