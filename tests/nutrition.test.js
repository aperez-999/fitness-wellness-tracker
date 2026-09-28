import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test as nodeTest } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { MongoMemoryServer } from "mongodb-memory-server";

const test = (name, run) => nodeTest(name, { timeout: 60_000 }, run);
const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const artifacts = path.join(root, "tests/artifacts");
const password = "Nutrition-test-902!";
const valid = { date: "2026-09-28", foodName: "Oatmeal with berries", calories: 420, protein: 18.5, carbohydrates: 62, fat: 11 };
let database, mongoose, apiServer, vite, browser, api, base, accounts, NutritionLog, User;
const contexts = [];

async function request(endpoint, token, body) {
  const response = await fetch(api + endpoint, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, cache: response.headers.get("cache-control"), data: await response.json() };
}
async function openPage(storageState) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-US", timezoneId: "America/New_York", storageState });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.goto(base + "/nutrition");
  if (!storageState) {
    await page.getByLabel("Email").fill("alex@example.test");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
  }
  await page.getByRole("heading", { name: "Nutrition", exact: true }).waitFor();
  await page.getByRole("button", { name: "Refresh", exact: true }).waitFor();
  return page;
}
async function fillEntry(page, entry = valid) {
  for (const field of ["date", "foodName", "calories", "protein", "carbohydrates", "fat"]) {
    await page.locator(`#nutrition-${field}`).fill(String(entry[field]));
  }
}

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  ({ default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js"));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  ({ NutritionLog } = await importLocal("backend/src/models/NutritionLog.js"));
  ({ User } = await importLocal("backend/src/models/User.js"));
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

beforeEach(async () => {
  await Promise.all([NutritionLog.deleteMany({}), User.deleteMany({})]);
  accounts = {};
  for (const name of ["alex", "sam"]) {
    const result = await request("/auth/signup", null, { email: `${name}@example.test`, displayName: name === "alex" ? "Alex Morgan" : "Sam Rivera", password, confirmPassword: password });
    assert.equal(result.status, 201);
    accounts[name] = result.data;
  }
});
afterEach(async () => { await Promise.all(contexts.splice(0).map((context) => context.close())); });
after(async () => {
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

test("API authenticates, stores all nutrients in MongoDB, and enforces ownership", async () => {
  for (const token of [undefined, "invalid"]) {
    assert.equal((await request("/nutrition", token)).status, 401);
    assert.equal((await request("/nutrition", token, valid)).status, 401);
  }
  const saved = await request("/nutrition", accounts.alex.token, { ...valid, userId: accounts.sam.user.id });
  assert.equal(saved.status, 201);
  const stored = await NutritionLog.findById(saved.data.entry._id).lean();
  assert.equal(String(stored.userId), accounts.alex.user.id);
  assert.equal(stored.date.toISOString(), "2026-09-28T00:00:00.000Z");
  for (const field of ["calories", "protein", "carbohydrates", "fat"]) assert.equal(stored[field], valid[field]);
  const other = await request(`/nutrition?userId=${accounts.alex.user.id}`, accounts.sam.token);
  assert.deepEqual(other.data.entries, []);
  const own = await request("/nutrition", accounts.alex.token);
  assert.equal(own.cache, "no-store");
  assert.equal(own.data.entries[0]._id, saved.data.entry._id);
  await writeFile(path.join(artifacts, "nutrition-api-evidence.json"), JSON.stringify({
    environment: "Disposable MongoDB; generated test accounts; no production data", checkedAt: new Date().toISOString(),
    createStatus: saved.status, entry: saved.data.entry, databaseRecord: stored,
    ownerListCount: own.data.entries.length, otherUserList: other.data.entries,
  }, null, 2));
});

test("API rejects malformed and missing values without inserting records, then accepts a valid entry", async () => {
  const invalid = [{}, [], { ...valid, date: "2026-02-30" }, { ...valid, foodName: {} }];
  for (const field of ["calories", "protein", "carbohydrates", "fat"]) {
    for (const value of [undefined, null, "", false, [], {}, -1, "NaN", "Infinity", 1e100]) invalid.push({ ...valid, [field]: value });
  }
  for (const body of invalid) assert.equal((await request("/nutrition", accounts.alex.token, body)).status, 400);
  const malformed = await fetch(api + "/nutrition", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accounts.alex.token}` }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.equal(await NutritionLog.countDocuments(), 0);
  assert.equal((await request("/nutrition", accounts.alex.token, { ...valid, calories: 0, protein: 0, carbohydrates: 0, fat: 0 })).status, 201);
});

test("recent entries are limited to 30 and sorted by date and creation time", async () => {
  for (let i = 1; i <= 31; i++) await NutritionLog.create({ ...valid, userId: accounts.alex.user.id, date: `2026-08-${String(i).padStart(2, "0")}` });
  await request("/nutrition", accounts.sam.token, valid);
  const { data } = await request("/nutrition", accounts.alex.token);
  assert.equal(data.entries.length, 30);
  assert.equal(data.entries[0].date.slice(0, 10), "2026-08-31");
  assert.equal(data.entries[29].date.slice(0, 10), "2026-08-02");
});

test("browser saves, validates, persists across reload and reopening, and renders accessible mobile UI", async () => {
  const page = await openPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.getByText("Your nutrition journal starts here.").waitFor();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 4);
  await fillEntry(page);
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByText("Entry saved.", { exact: true }).waitFor();
  await page.getByRole("heading", { name: valid.foodName }).waitFor();
  assert.equal(await NutritionLog.countDocuments({ userId: accounts.alex.user.id }), 1);
  await page.reload();
  await page.getByRole("heading", { name: valid.foodName }).waitFor();
  const state = await page.context().storageState();
  await page.context().close();
  const reopened = await openPage(state);
  await reopened.getByRole("heading", { name: valid.foodName }).waitFor();
  assert.match(await reopened.locator(".nutrition-entry").innerText(), /18.5/);
  for (const entry of [
    { ...valid, foodName: "Grilled chicken & rice", calories: 610, protein: 48, carbohydrates: 65, fat: 17, date: "2026-09-27" },
    { ...valid, foodName: "Greek yogurt", calories: 150, protein: 15, carbohydrates: 12, fat: 4, date: "2026-09-27" },
  ]) await request("/nutrition", accounts.alex.token, entry);
  await reopened.getByRole("button", { name: "Refresh", exact: true }).click();
  await reopened.getByRole("heading", { name: "Greek yogurt" }).waitFor();
  assert.equal((await new AxeBuilder({ page: reopened }).analyze()).violations.length, 0);
  await reopened.screenshot({ path: path.join(artifacts, "nutrition-desktop.png"), fullPage: true });
  await reopened.setViewportSize({ width: 390, height: 844 });
  assert.equal(await reopened.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal((await new AxeBuilder({ page: reopened }).analyze()).violations.length, 0);
  await reopened.screenshot({ path: path.join(artifacts, "nutrition-mobile.png"), fullPage: true });
  assert.deepEqual(pageErrors, []);
});

test("browser keeps drafts on save failure and recovers from failed reads", async () => {
  const page = await openPage();
  await fillEntry(page);
  await page.route("**/api/nutrition", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Unavailable"}' }));
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByText(/Could not save your entry/).waitFor();
  assert.equal(await page.locator("#nutrition-protein").inputValue(), "18.5");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByText(/Could not load your entries/).waitFor();
  await page.unroute("**/api/nutrition");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByText("Your nutrition journal starts here.").waitFor();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByText("Entry saved.", { exact: true }).waitFor();
  assert.equal(await NutritionLog.countDocuments(), 1);
});

test("account switching clears private entries and drafts; expired sessions return to login", async () => {
  await request("/nutrition", accounts.alex.token, valid);
  const page = await openPage();
  await page.getByRole("heading", { name: valid.foodName }).waitFor();
  await page.locator("#nutrition-foodName").fill("Private draft");
  const otherTab = await page.context().newPage();
  await otherTab.goto(base + "/nutrition");
  await otherTab.evaluate((token) => localStorage.setItem("fwt_token", token), accounts.sam.token);
  await page.getByText("Your nutrition journal starts here.").waitFor();
  assert.equal(await page.locator("#nutrition-foodName").inputValue(), "");
  assert.equal(await page.getByRole("heading", { name: valid.foodName }).count(), 0);
  await page.route("**/api/nutrition", (route) => route.fulfill({ status: 401, contentType: "application/json", body: '{"message":"Unauthorized"}' }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByRole("button", { name: "Log in", exact: true }).waitFor();
});

test("saving cancels stale history reads and blocks duplicate submissions", async () => {
  const page = await openPage();
  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
  };
  const readStarted = deferred(), releaseRead = deferred(), readFinished = deferred();
  const postStarted = deferred(), releasePost = deferred();
  let holdRead = true;
  let posts = 0;
  await page.route("**/api/nutrition", async (route) => {
    if (route.request().method() === "GET" && holdRead) {
      holdRead = false;
      const response = await route.fetch();
      readStarted.resolve();
      await releaseRead.promise;
      try { await route.fulfill({ response }); } catch { /* Request was canceled after save. */ }
      readFinished.resolve();
    } else if (route.request().method() === "POST") {
      posts++;
      postStarted.resolve();
      await releasePost.promise;
      await route.continue();
    } else await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await readStarted.promise;
    await fillEntry(page);
    await page.getByRole("button", { name: "Save entry", exact: true }).click();
    await postStarted.promise;
    await page.locator(".nutrition-composer form").evaluate((form) => form.requestSubmit());
    releasePost.resolve();
    await page.getByText("Entry saved.", { exact: true }).waitFor();
    releaseRead.resolve();
    await readFinished.promise;
    await page.getByRole("button", { name: "Refresh", exact: true }).waitFor();
    await page.getByRole("heading", { name: valid.foodName }).waitFor();
    assert.equal(posts, 1);
    assert.equal(await NutritionLog.countDocuments(), 1);
  } finally {
    releaseRead.resolve();
    releasePost.resolve();
  }
});

test("meal estimates fill editable sliders, scale portions, and retain provenance after reopening", async () => {
  const page = await openPage();
  await page.locator("#nutrition-foodName").fill("Oatmeal with berries");
  await page.getByText(/37.5 g dry oats/).waitFor();
  await page.getByRole("button", { name: "Fill with estimate", exact: true }).click();
  assert.equal(await page.locator("#nutrition-calories").inputValue(), "207");
  assert.equal(await page.locator("#nutrition-protein").inputValue(), "8.4");
  assert.equal(await page.locator("#nutrition-carbohydrates").inputValue(), "33.8");
  assert.equal(await page.locator("#nutrition-fat").inputValue(), "3.9");
  await page.getByRole("button", { name: "Quick meal estimate", exact: true }).click();
  await page.getByLabel("Servings", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Replace values with estimate", exact: true }).click();
  assert.equal(await page.locator("#nutrition-calories").inputValue(), "414");
  await page.getByRole("slider", { name: "Adjust protein", exact: true }).focus();
  await page.keyboard.press("End");
  assert.equal(await page.locator("#nutrition-protein").inputValue(), "100");
  await page.locator("#nutrition-protein").fill("16.8");
  await page.locator("#nutrition-calories").fill("1500");
  assert.equal(await page.getByRole("slider", { name: "Adjust calories", exact: true }).getAttribute("max"), "1500");
  await page.locator("#nutrition-calories").fill("420");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByText("Entry saved.", { exact: true }).waitFor();
  const stored = await NutritionLog.findOne({ userId: accounts.alex.user.id }).lean();
  assert.deepEqual(stored.estimate, { referenceId: "berry-oatmeal", servings: 2, edited: true });
  assert.equal(stored.calories, 420);
  await page.locator("#nutrition-foodName").fill("Oatmeal with berries");
  assert.equal(await page.getByLabel("Servings", { exact: true }).inputValue(), "1");
  await page.reload();
  await page.getByText(/Estimate, adjusted/).waitFor();
  await page.locator("#nutrition-foodName").fill("Oatmeal with berries");
  await page.getByRole("button", { name: "Fill with estimate", exact: true }).click();
  await page.locator("#nutrition-foodName").click();
  assert.equal((await new AxeBuilder({ page }).analyze()).violations.length, 0);
  await page.screenshot({ path: path.join(artifacts, "nutrition-interactive-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal((await new AxeBuilder({ page }).analyze()).violations.length, 0);
  await page.screenshot({ path: path.join(artifacts, "nutrition-interactive-mobile.png"), fullPage: true });
});

test("unsupported meals and invalid servings preserve entered values and estimate metadata is private", async () => {
  const page = await openPage();
  await fillEntry(page, { ...valid, foodName: "Oatmeal with berries and peanut butter" });
  await page.getByText(/No reference for this meal yet/).waitFor();
  assert.equal(await page.getByRole("button", { name: /with estimate/ }).count(), 0);
  assert.equal(await page.locator("#nutrition-calories").inputValue(), "420");
  await page.getByLabel("Reference meal", { exact: true }).selectOption("yogurt-parfait");
  assert.equal(await page.locator("#nutrition-calories").inputValue(), "420");
  await page.getByLabel("Servings", { exact: true }).fill("0");
  assert.equal(await page.getByRole("button", { name: "Replace values with estimate" }).isDisabled(), true);
  await page.getByLabel("Servings", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Increase servings" }).click();
  assert.equal(await page.getByLabel("Servings", { exact: true }).inputValue(), "1.25");
  await page.getByRole("button", { name: "Decrease servings" }).click();
  await page.getByRole("button", { name: "Replace values with estimate" }).click();
  assert.equal(await page.locator("#nutrition-calories").inputValue(), "259");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByText("Entry saved.", { exact: true }).waitFor();
  assert.equal((await request("/nutrition", accounts.sam.token)).data.entries.length, 0);
  const own = await request("/nutrition", accounts.alex.token);
  assert.equal(own.data.entries[0].estimate.edited, false);
  for (const estimate of [{ referenceId: "fake", servings: 1 }, { referenceId: "berry-oatmeal" }, { referenceId: "berry-oatmeal", servings: -1 }]) {
    assert.equal((await request("/nutrition", accounts.alex.token, { ...valid, estimate })).status, 400);
  }
});
