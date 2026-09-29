import assert from "node:assert/strict";
import { after, before, test as nodeTest } from "node:test";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { MongoMemoryServer } from "mongodb-memory-server";

const test = (name, run) => nodeTest(name, { timeout: 60_000 }, run);
let gate = Promise.resolve();
function serial(name, run) {
  const previous = gate;
  let open;
  gate = new Promise((resolve) => { open = resolve; });
  test(name, async () => {
    await previous;
    try {
      await run();
    } finally {
      open();
    }
  });
}
const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const password = "Profile-test-902!";
const profileBody = (overrides = {}) => ({
  displayName: "",
  pronouns: "",
  aboutMe: "",
  favoriteActivities: [],
  ...overrides,
});
let database, mongoose, apiServer, vite, browser, api, base, accounts, User;

async function request(endpoint, token, body, method) {
  const response = await fetch(api + endpoint, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  ({ default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js"));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  ({ User } = await importLocal("backend/src/models/User.js"));
  const { default: routes } = await importLocal("backend/src/routes/index.js");
  const { errorHandler } = await importLocal("backend/src/middleware/errorHandler.js");
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", routes);
  app.use(errorHandler);
  apiServer = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  api = `http://127.0.0.1:${apiServer.address().port}/api`;
  process.env.VITE_API_URL = api;
  const { createServer } = await importLocal("frontend/node_modules/vite/dist/node/index.js");
  vite = await createServer({
    root: path.join(root, "frontend"),
    configFile: path.join(root, "frontend/vite.config.js"),
    server: { port: 0, host: "127.0.0.1" },
  });
  await vite.listen();
  base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({
    channel: process.env.TEST_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
  });
  accounts = {};
  for (const name of ["alex", "sam"]) {
    const result = await request("/auth/signup", null, {
      email: `${name}@example.test`,
      displayName: name === "alex" ? "Alex Morgan" : "Sam Rivera",
      password,
      confirmPassword: password,
    });
    assert.equal(result.status, 201);
    accounts[name] = result.data;
  }
}, { timeout: 120_000 });

after(async () => {
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

serial("saves a profile for the authenticated user only", async () => {
  for (const token of [undefined, "invalid"]) {
    assert.equal((await request("/auth/me", token)).status, 401);
    assert.equal((await request("/auth/me", token, profileBody({ displayName: "Nope" }), "PATCH")).status, 401);
  }

  const beforeReject = await User.findById(accounts.alex.user.id).lean();
  const rejected = await request("/auth/me", accounts.alex.token, profileBody({
    displayName: "Alex Morgan",
    aboutMe: "a".repeat(281),
  }), "PATCH");
  assert.equal(rejected.status, 400);
  assert.equal(rejected.data.errors.aboutMe, "Keep your about me to 280 characters or fewer.");
  const unknownActivity = await request("/auth/me", accounts.alex.token, profileBody({
    displayName: "Alex Morgan",
    favoriteActivities: ["Swim"],
  }), "PATCH");
  assert.equal(unknownActivity.status, 400);
  assert.equal(unknownActivity.data.errors.favoriteActivities, "Choose activities from the list.");
  const afterReject = await User.findById(accounts.alex.user.id).lean();
  assert.equal(afterReject.displayName, beforeReject.displayName);
  assert.equal(afterReject.aboutMe ?? null, beforeReject.aboutMe ?? null);
  assert.deepEqual(afterReject.favoriteActivities ?? [], beforeReject.favoriteActivities ?? []);

  const spoofed = await request("/auth/me", accounts.alex.token, profileBody({
    displayName: "  Jordan Lee  ",
    pronouns: " they/them ",
    aboutMe: "  Morning walks.\nEvening stretches.  ",
    favoriteActivities: ["Walk", "Strength"],
    userId: accounts.sam.user.id,
    email: "taken@example.test",
    password: "New-password-1!",
    passwordHash: "plaintext",
  }), "PATCH");
  assert.equal(spoofed.status, 200);
  assert.equal(spoofed.data.user.displayName, "Jordan Lee");
  assert.equal(spoofed.data.user.pronouns, "they/them");
  assert.equal(spoofed.data.user.aboutMe, "Morning walks.\nEvening stretches.");
  assert.deepEqual(spoofed.data.user.favoriteActivities, ["Walk", "Strength"]);
  assert.equal(spoofed.data.user.email, "alex@example.test");
  assert.equal(spoofed.data.user.id, accounts.alex.user.id);

  const storedAlex = await User.findById(accounts.alex.user.id).lean();
  const storedSam = await User.findById(accounts.sam.user.id).lean();
  assert.equal(storedAlex.displayName, "Jordan Lee");
  assert.equal(storedAlex.pronouns, "they/them");
  assert.equal(storedAlex.aboutMe, "Morning walks.\nEvening stretches.");
  assert.deepEqual(storedAlex.favoriteActivities, ["Walk", "Strength"]);
  assert.equal(storedAlex.email, "alex@example.test");
  assert.notEqual(storedAlex.passwordHash, "plaintext");
  assert.equal(storedSam.displayName, "Sam Rivera");
  assert.equal(storedSam.email, "sam@example.test");

  const me = await request("/auth/me", accounts.alex.token);
  assert.equal(me.data.user.displayName, "Jordan Lee");
  assert.deepEqual(me.data.user.favoriteActivities, ["Walk", "Strength"]);
  const sam = await request("/auth/me", accounts.sam.token);
  assert.equal(sam.data.user.displayName, "Sam Rivera");
  assert.equal(sam.data.user.email, "sam@example.test");
  assert.equal(sam.data.user.aboutMe, null);
  assert.deepEqual(sam.data.user.favoriteActivities, []);

  const relogin = await request("/auth/login", null, {
    email: "alex@example.test",
    password,
  });
  assert.equal(relogin.status, 200);
  assert.equal(relogin.data.user.displayName, "Jordan Lee");
  assert.equal(relogin.data.user.pronouns, "they/them");

  const cleared = await request("/auth/me", accounts.alex.token, profileBody(), "PATCH");
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.user.displayName, null);
  assert.equal(cleared.data.user.pronouns, null);
  assert.equal(cleared.data.user.aboutMe, null);
  assert.deepEqual(cleared.data.user.favoriteActivities, []);
  const clearedUser = await User.findById(accounts.alex.user.id).lean();
  assert.equal(clearedUser.displayName, null);
  assert.equal(clearedUser.aboutMe, null);
  assert.deepEqual(clearedUser.favoriteActivities, []);
});

serial("profile page keeps an edited name after refresh and sign-in", async () => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(30_000);
  try {
    await page.goto(base + "/profile");
    await page.getByLabel("Email").fill("alex@example.test");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("heading", { name: "Profile", exact: true }).waitFor();
    await page.locator("#main-content").getByText("alex@example.test", { exact: true }).waitFor();
    const name = page.getByLabel("Display name");
    const current = await request("/auth/me", accounts.alex.token);
    assert.equal(await name.inputValue(), current.data.user.displayName || "");
    const beforeInvalid = (await User.findById(accounts.alex.user.id).lean()).displayName ?? null;

    await name.fill("a".repeat(81));
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await page.getByText("Keep your display name to 80 characters or fewer.").waitFor();
    assert.equal((await User.findById(accounts.alex.user.id).lean()).displayName ?? null, beforeInvalid);

    const about = page.getByRole("textbox", { name: "About me" });
    await name.fill("Alex Updated");
    await about.fill("a".repeat(281));
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await page.getByText("Keep your about me to 280 characters or fewer.").waitFor();
    assert.equal((await User.findById(accounts.alex.user.id).lean()).displayName ?? null, beforeInvalid);

    await about.fill("I like quiet morning walks.");
    await page.getByLabel("Pronouns").fill("she/her");
    await page.getByRole("button", { name: "Walk", exact: true }).click();
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await page.getByRole("status").getByText("Profile saved.").waitFor();
    await page.locator(".account-details strong", { hasText: "Alex Updated" }).waitFor();

    await page.reload();
    await page.getByRole("heading", { name: "Profile", exact: true }).waitFor();
    assert.equal(await page.getByLabel("Display name").inputValue(), "Alex Updated");
    assert.equal(await page.getByLabel("Pronouns").inputValue(), "she/her");
    assert.equal(await page.getByRole("textbox", { name: "About me" }).inputValue(), "I like quiet morning walks.");
    assert.equal(await page.getByRole("button", { name: "Walk", exact: true }).getAttribute("aria-pressed"), "true");

    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.getByLabel("Email").fill("alex@example.test");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("heading", { name: "Your progress", exact: true }).waitFor();
    await page.getByRole("link", { name: "Profile", exact: true }).click();
    await page.getByRole("heading", { name: "Profile", exact: true }).waitFor();
    assert.equal(await page.getByLabel("Display name").inputValue(), "Alex Updated");
    assert.equal(await page.getByRole("textbox", { name: "About me" }).inputValue(), "I like quiet morning walks.");
    await page.locator("#main-content").getByText("alex@example.test", { exact: true }).waitFor();

    const samContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });
    const samPage = await samContext.newPage();
    samPage.setDefaultTimeout(8_000);
    try {
      await samPage.goto(base + "/login");
      await samPage.getByLabel("Email").fill("sam@example.test");
      await samPage.getByLabel("Password", { exact: true }).fill(password);
      await samPage.getByRole("button", { name: "Log in", exact: true }).click();
      await samPage.getByRole("link", { name: "Profile", exact: true }).click();
      await samPage.getByRole("heading", { name: "Profile", exact: true }).waitFor();
      assert.equal(await samPage.getByLabel("Display name").inputValue(), "Sam Rivera");
      await samPage.locator("#main-content").getByText("sam@example.test", { exact: true }).waitFor();
      assert.equal(await samPage.getByText("Alex Updated").count(), 0);
      assert.equal(await samPage.getByText("I like quiet morning walks.").count(), 0);
    } finally {
      await samContext.close();
    }
  } finally {
    await context.close();
  }
});
