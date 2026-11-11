import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test as nodeTest } from "node:test";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { MongoMemoryServer } from "mongodb-memory-server";

const test = (name, run) => nodeTest(name, { timeout: 60_000 }, run);
const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const artifacts = path.join(root, "tests/artifacts");
const clientId = "integration-test.apps.googleusercontent.com";
const password = "Google-test-731!";
const realFetch = globalThis.fetch;
const contexts = [];
const google = generateKeyPairSync("rsa", { modulusLength: 2048 });
const googleKeys = [{ ...google.publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" }];
let database, mongoose, apiServer, vite, browser, api, base, jwt, User;

// Signs an ID token the way Google would, with the test key the backend is told to trust.
function googleCredential(claims = {}, options = {}) {
  return jwt.sign(
    { email: "alex@example.test", email_verified: true, name: "Alex Morgan", ...claims },
    google.privateKey,
    {
      algorithm: "RS256",
      keyid: "test-key",
      audience: clientId,
      issuer: "https://accounts.google.com",
      subject: "google-alex",
      expiresIn: "1h",
      ...options,
    },
  );
}

async function request(endpoint, body, token) {
  const response = await fetch(api + endpoint, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

// Replaces Google's script with a stand-in whose button hands the page a credential.
async function openPage(pagePath, credential, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, locale: "en-US" });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.route("https://accounts.google.com/gsi/client", (route) => route.fulfill({
    contentType: "text/javascript",
    body: `
      window.google = { accounts: { id: {
        initialize(config) { window.__google = config; },
        renderButton(element, options) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Continue with Google";
          button.style.cssText = "width:" + options.width + "px;height:44px";
          button.onclick = () => window.__google.callback({ credential: ${JSON.stringify(credential)} });
          element.replaceChildren(button);
        },
      } } };
    `,
  }));
  await page.goto(base + pagePath);
  return page;
}

before(async () => {
  process.env.GOOGLE_CLIENT_ID = clientId;
  process.env.VITE_GOOGLE_CLIENT_ID = clientId;
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  globalThis.fetch = async (url, options) => {
    if (String(url) !== "https://www.googleapis.com/oauth2/v3/certs") return realFetch(url, options);
    return { ok: true, status: 200, json: async () => ({ keys: googleKeys }) };
  };
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  ({ default: jwt } = await importLocal("backend/node_modules/jsonwebtoken/index.js"));
  ({ default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js"));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  ({ User } = await importLocal("backend/src/models/User.js"));
  await User.init();
  const { default: routes } = await importLocal("backend/src/routes/index.js");
  const { errorHandler } = await importLocal("backend/src/middleware/errorHandler.js");
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", routes);
  app.use(errorHandler);
  apiServer = await new Promise((resolve) => { const server = app.listen(0, "127.0.0.1", () => resolve(server)); });
  api = `http://127.0.0.1:${apiServer.address().port}/api`;
  process.env.VITE_API_URL = api;
  const { createServer } = await importLocal("frontend/node_modules/vite/dist/node/index.js");
  vite = await createServer({ root: path.join(root, "frontend"), configFile: path.join(root, "frontend/vite.config.js"), server: { port: 0, host: "127.0.0.1" } });
  await vite.listen();
  base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined), headless: true });
  await mkdir(artifacts, { recursive: true });
}, { timeout: 120_000 });

beforeEach(async () => { await User.deleteMany({}); });
afterEach(async () => { await Promise.all(contexts.splice(0).map((context) => context.close())); });
after(async () => {
  globalThis.fetch = realFetch;
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

test("Google sign-in creates an account once and returns the same account afterwards", async () => {
  const created = await request("/auth/google", { credential: googleCredential() });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.email, "alex@example.test");
  assert.equal(created.data.user.displayName, "Alex Morgan");
  assert.equal(created.data.user.passwordHash, undefined);
  assert.equal(created.data.user.googleId, undefined);

  const me = await request("/auth/me", undefined, created.data.token);
  assert.equal(me.status, 200);
  assert.equal(me.data.user.id, created.data.user.id);

  // The Google account ID identifies the user, even if their Google email changes.
  const returning = await request("/auth/google", { credential: googleCredential({ email: "alex.new@example.test" }) });
  assert.equal(returning.status, 200);
  assert.equal(returning.data.user.id, created.data.user.id);
  assert.equal(await User.countDocuments({}), 1);
});

test("Google sign-in rejects credentials it cannot verify", async () => {
  const rejected = [
    googleCredential({}, { audience: "another-app.apps.googleusercontent.com" }),
    googleCredential({}, { issuer: "https://accounts.example.test" }),
    googleCredential({}, { expiresIn: "-1m" }),
    googleCredential({ email_verified: false }),
    jwt.sign({ email: "alex@example.test", email_verified: true, sub: "google-alex" }, "guessable-secret", { keyid: "test-key", audience: clientId, issuer: "accounts.google.com" }),
    "not-a-token",
  ];
  for (const credential of rejected) {
    assert.equal((await request("/auth/google", { credential })).status, 401);
  }
  for (const body of [{}, { credential: 42 }, { credential: "" }, { credential: "x".repeat(5000) }]) {
    assert.equal((await request("/auth/google", body)).status, 400);
  }
  assert.equal(await User.countDocuments({}), 0);

  process.env.GOOGLE_CLIENT_ID = "";
  const unconfigured = await request("/auth/google", { credential: googleCredential() });
  process.env.GOOGLE_CLIENT_ID = clientId;
  assert.equal(unconfigured.status, 503);
});

test("Google sign-in never takes over a password account, and Google accounts have no password login", async () => {
  const signup = await request("/auth/signup", { email: "alex@example.test", password, confirmPassword: password });
  assert.equal(signup.status, 201);

  const takeover = await request("/auth/google", { credential: googleCredential() });
  assert.equal(takeover.status, 409);
  assert.equal(takeover.data.token, undefined);
  assert.match(takeover.data.message, /Log in with your password/);
  assert.equal((await request("/auth/login", { email: "alex@example.test", password })).status, 200);

  const sam = await request("/auth/google", { credential: googleCredential({ email: "sam@example.test" }, { subject: "google-sam" }) });
  assert.equal(sam.status, 201);
  for (const guess of [password, "undefined", "null"]) {
    assert.equal((await request("/auth/login", { email: "sam@example.test", password: guess })).status, 401);
  }
  assert.equal((await request("/auth/signup", { email: "sam@example.test", password, confirmPassword: password })).status, 409);
});

test("Login and signup pages sign in with Google on desktop and phone", async () => {
  const page = await openPage("/login", googleCredential());
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { name: "What your recent habits say" }).waitFor();
  assert.equal(await User.countDocuments({ email: "alex@example.test", googleId: "google-alex" }), 1);

  const phone = await openPage("/signup", googleCredential({ email: "sam@example.test" }, { subject: "google-sam" }), { width: 320, height: 640 });
  const button = phone.getByRole("button", { name: "Continue with Google" });
  await button.waitFor();
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.equal(overflow, 0, "no horizontal scroll at 320px");
  assert.ok((await button.boundingBox()).height >= 44, "touch target stays at least 44px tall");
  const audit = await new AxeBuilder({ page: phone }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(audit.violations.map((violation) => violation.id), []);
  await phone.screenshot({ path: path.join(artifacts, "google-signin-signup-mobile.png"), fullPage: true });
  await button.click();
  await phone.waitForURL("**/dashboard");
});

test("Login page explains when Google sign-in is refused", async () => {
  await request("/auth/signup", { email: "alex@example.test", password, confirmPassword: password });
  const page = await openPage("/login", googleCredential(), { width: 390, height: 844 });
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.getByRole("alert").getByText("An account with this email already exists. Log in with your password.").waitFor();
  assert.ok(page.url().endsWith("/login"));
  await page.screenshot({ path: path.join(artifacts, "google-signin-refused-mobile.png"), fullPage: true });
});
