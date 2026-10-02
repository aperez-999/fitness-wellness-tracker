import assert from "node:assert/strict";
import { after, before, test as nodeTest } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { MongoMemoryServer } from "mongodb-memory-server";

const test = (name, run) => nodeTest(name, { timeout: 90_000 }, run);
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
const artifacts = path.join(root, "tests/artifacts");
const password = "Goals-test-417!";
const timeZone = "America/New_York";
// "YYYY-MM-DD" a number of days from now. Far enough from today that timezones never matter.
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const goalBody = (overrides = {}) => ({
  title: "Run 20 miles",
  category: "workout",
  targetValue: 20,
  unit: "miles",
  targetDate: daysFromNow(30),
  timeZone,
  ...overrides,
});
let database, mongoose, apiServer, vite, browser, api, base, accounts, Goal;

async function request(endpoint, token, body, method) {
  const response = await fetch(api + endpoint, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function signedInPage(email, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, locale: "en-US", timezoneId: timeZone });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.goto(base + "/goals");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("heading", { name: "Goals", exact: true }).waitFor();
  return { context, page };
}

const card = (page, title) => page.locator(".goal-card", { has: page.getByRole("heading", { name: title, exact: true }) });

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  ({ default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js"));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  ({ Goal } = await importLocal("backend/src/models/Goal.js"));
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
  await mkdir(artifacts, { recursive: true });
  accounts = {};
  for (const name of ["alex", "sam"]) {
    const result = await request("/auth/signup", null, {
      email: `${name}.goals@example.test`,
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

serial("goal API requires a login, validates input, and keeps goals private", async () => {
  const alex = accounts.alex;
  const sam = accounts.sam;
  const missingId = "000000000000000000000000";

  // Authentication: every route refuses a missing or fake token.
  for (const token of [undefined, "invalid"]) {
    assert.equal((await request("/goals", token)).status, 401);
    assert.equal((await request("/goals", token, goalBody())).status, 401);
    assert.equal((await request(`/goals/${missingId}`, token, goalBody(), "PUT")).status, 401);
    assert.equal((await request(`/goals/${missingId}`, token, undefined, "DELETE")).status, 401);
  }

  // Invalid input: clear field errors, nothing saved.
  const empty = await request("/goals", alex.token, {});
  assert.equal(empty.status, 400);
  assert.deepEqual(Object.keys(empty.data.errors).sort(), ["category", "targetDate", "targetValue", "title"]);
  assert.equal(empty.data.errors.targetDate, "Choose a target date.");
  for (const [overrides, field, message] of [
    [{ targetValue: 0 }, "targetValue", "Enter a target above zero."],
    [{ targetValue: -5 }, "targetValue", "Enter a target above zero."],
    [{ category: "sleep" }, "category", "Choose workout, nutrition, or wellness."],
    [{ title: "a".repeat(121) }, "title", "Enter a goal name between 1 and 120 characters."],
    [{ targetDate: daysFromNow(-30) }, "targetDate", "Choose today or a later date."],
    [{ targetDate: "2026-02-30" }, "targetDate", "Enter a valid date in YYYY-MM-DD format."],
  ]) {
    const rejected = await request("/goals", alex.token, goalBody(overrides));
    assert.equal(rejected.status, 400, JSON.stringify(overrides));
    assert.equal(rejected.data.errors[field], message);
  }
  assert.equal(await Goal.countDocuments({ userId: alex.user.id }), 0);

  // Create: owner comes from the token, never the request body.
  const created = await request("/goals", alex.token, goalBody({
    title: "  Run 20 miles  ",
    userId: sam.user.id,
    status: "completed",
    currentValue: 4,
  }));
  assert.equal(created.status, 201);
  assert.equal(created.data.goal.title, "Run 20 miles");
  assert.equal(created.data.goal.status, "active");
  const runId = created.data.goal._id;
  const stored = await Goal.findById(runId).lean();
  assert.equal(String(stored.userId), alex.user.id);
  assert.equal(stored.category, "workout");
  assert.equal(stored.targetValue, 20);
  assert.equal(stored.currentValue, 4);
  assert.equal(stored.targetDate.toISOString(), `${goalBody().targetDate}T00:00:00.000Z`);
  const water = await request("/goals", alex.token, goalBody({
    title: "Drink 8 glasses",
    category: "wellness",
    targetValue: "8",
    unit: "glasses",
    targetDate: daysFromNow(7),
  }));
  assert.equal(water.status, 201);

  // List: only the owner's active goals, soonest deadline first.
  const alexList = await request("/goals", alex.token);
  assert.deepEqual(alexList.data.goals.map((goal) => goal.title), ["Drink 8 glasses", "Run 20 miles"]);
  assert.deepEqual((await request("/goals", sam.token)).data.goals, []);
  assert.equal((await request("/goals?status=whatever", alex.token)).status, 400);

  // Another user cannot change or delete the goal.
  assert.equal((await request(`/goals/${runId}`, sam.token, goalBody({ title: "Hijacked" }), "PUT")).status, 404);
  assert.equal((await request(`/goals/${runId}`, sam.token, undefined, "DELETE")).status, 404);
  assert.equal((await Goal.findById(runId).lean()).title, "Run 20 miles");

  // Update: same ID and creation time, cleared unit removed, bad input refused.
  const edited = await request(`/goals/${runId}`, alex.token, goalBody({ title: "Run 25 miles", targetValue: 25, currentValue: 6, unit: "" }), "PUT");
  assert.equal(edited.status, 200);
  const afterEdit = await Goal.findById(runId).lean();
  assert.equal(afterEdit.title, "Run 25 miles");
  assert.equal(afterEdit.currentValue, 6);
  assert.equal("unit" in afterEdit, false);
  assert.equal(afterEdit.createdAt.toISOString(), stored.createdAt.toISOString());
  const badEdit = await request(`/goals/${runId}`, alex.token, goalBody({ targetValue: -1 }), "PUT");
  assert.equal(badEdit.status, 400);
  assert.equal((await Goal.findById(runId).lean()).targetValue, 25);
  assert.equal((await request("/goals/abc", alex.token, goalBody(), "PUT")).status, 400);
  assert.equal((await request(`/goals/${missingId}`, alex.token, goalBody(), "PUT")).status, 404);

  // Completing raises progress to the target and moves the goal to the completed list.
  const completed = await request(`/goals/${runId}`, alex.token, goalBody({ title: "Run 25 miles", targetValue: 25, currentValue: 6, status: "completed" }), "PUT");
  assert.equal(completed.data.goal.status, "completed");
  assert.equal(completed.data.goal.currentValue, 25);
  assert.deepEqual((await request("/goals", alex.token)).data.goals.map((goal) => goal.title), ["Drink 8 glasses"]);
  assert.deepEqual((await request("/goals?status=completed", alex.token)).data.goals.map((goal) => goal.title), ["Run 25 miles"]);
  // A progress-only update can't pull a completed goal below its target.
  const progressOnly = await request(`/goals/${runId}`, alex.token, goalBody({ title: "Run 25 miles", targetValue: 25, currentValue: 3 }), "PUT");
  assert.equal(progressOnly.data.goal.status, "completed");
  assert.equal(progressOnly.data.goal.currentValue, 25);

  // An overdue goal can keep its date when edited, but not move to another past date.
  const overdue = await Goal.create({ userId: alex.user.id, title: "Old goal", category: "wellness", targetValue: 5, targetDate: daysFromNow(-10) });
  const overdueBody = goalBody({ title: "Old goal", category: "wellness", targetValue: 5, targetDate: daysFromNow(-10) });
  assert.equal((await request(`/goals/${overdue._id}`, alex.token, { ...overdueBody, currentValue: 2 }, "PUT")).status, 200);
  assert.equal((await request(`/goals/${overdue._id}`, alex.token, { ...overdueBody, targetDate: daysFromNow(-9) }, "PUT")).status, 400);

  // Delete: owner only; the record is gone; deleting again is 404.
  assert.equal((await request(`/goals/${overdue._id}`, alex.token, undefined, "DELETE")).status, 204);
  assert.equal(await Goal.findById(overdue._id), null);
  assert.equal((await request(`/goals/${overdue._id}`, alex.token, undefined, "DELETE")).status, 404);

  await writeFile(path.join(artifacts, "goals-api-evidence.json"), JSON.stringify({
    created: { status: created.status, ownerMatchesToken: String(stored.userId) === alex.user.id, spoofedOwnerIgnored: String(stored.userId) !== sam.user.id },
    emptyCreate: { status: empty.status, errors: empty.data.errors },
    otherUserList: (await request("/goals", sam.token)).data.goals.length,
    completedProgress: `${completed.data.goal.currentValue} / ${completed.data.goal.targetValue}`,
    storedGoals: (await Goal.find({ userId: alex.user.id }).lean()).map((goal) => ({
      title: goal.title,
      owner: String(goal.userId),
      status: goal.status,
      progress: `${goal.currentValue} / ${goal.targetValue}`,
      targetDate: goal.targetDate.toISOString().slice(0, 10),
    })),
  }, null, 2));
});

serial("goals page creates, updates, completes, and deletes goals in the browser", async () => {
  await Goal.deleteMany({});
  const alexId = accounts.alex.user.id;
  const { context, page } = await signedInPage("alex.goals@example.test");
  try {
    await page.getByRole("heading", { name: "No active goals yet" }).waitFor();

    // Invalid input shows the server's messages and saves nothing.
    await page.getByRole("button", { name: "New goal" }).click();
    await page.getByRole("button", { name: "Add goal" }).click();
    await page.getByText("Enter a goal name between 1 and 120 characters.").waitFor();
    await page.getByText("Enter a target above zero.").waitFor();
    await page.getByText("Choose a target date.").waitFor();
    assert.equal(await Goal.countDocuments(), 0);

    // Create.
    await page.getByLabel("Goal name").fill("Run 20 miles");
    await page.getByLabel("Target", { exact: true }).fill("20");
    await page.getByLabel("Unit (optional)").fill("miles");
    await page.getByLabel("Target date").fill(daysFromNow(30));
    await page.getByRole("button", { name: "Add goal" }).click();
    await page.getByRole("status").getByText("Goal added.").waitFor();
    await card(page, "Run 20 miles").getByText("0 / 20 miles").waitFor();
    const stored = await Goal.findOne({ title: "Run 20 miles" }).lean();
    assert.equal(String(stored.userId), alexId);
    assert.equal(stored.status, "active");

    // Update progress with the slider (keyboard), which saves by itself.
    const slider = page.getByRole("slider", { name: "Progress for Run 20 miles" });
    await slider.focus();
    for (let step = 0; step < 5; step += 1) await page.keyboard.press("ArrowRight");
    await card(page, "Run 20 miles").getByText("Saved").waitFor();
    assert.equal((await Goal.findById(stored._id).lean()).currentValue, 5);

    // Update details with the Edit form; changes survive a reload.
    await card(page, "Run 20 miles").getByRole("button", { name: "Edit" }).click();
    assert.equal(await page.getByLabel("Progress so far").inputValue(), "5");
    await page.getByLabel("Goal name").fill("Run 30 miles");
    await page.getByLabel("Target", { exact: true }).fill("30");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("status").getByText("Goal updated.").waitFor();
    await page.reload();
    await card(page, "Run 30 miles").getByText("5 / 30 miles").waitFor();
    assert.equal((await Goal.findById(stored._id).lean()).title, "Run 30 miles");

    await new AxeBuilder({ page }).analyze().then(({ violations }) => assert.deepEqual(violations.map((v) => v.id), []));
    await page.screenshot({ path: path.join(artifacts, "goals-desktop.png"), fullPage: true });

    // Complete: leaves the active list, shows full progress under Completed.
    await card(page, "Run 30 miles").getByRole("button", { name: "Mark complete" }).click();
    await page.getByRole("status").getByText('"Run 30 miles" marked complete.').waitFor();
    assert.equal(await card(page, "Run 30 miles").count(), 0);
    await page.getByRole("button", { name: "Completed" }).click();
    await card(page, "Run 30 miles").getByText("30 / 30 miles").waitFor();
    const completed = await Goal.findById(stored._id).lean();
    assert.equal(completed.status, "completed");
    assert.equal(completed.currentValue, 30);
    await card(page, "Run 30 miles").getByRole("button", { name: "Move back to active" }).click();
    await page.getByRole("button", { name: "Active", exact: true }).click();
    await card(page, "Run 30 miles").waitFor();
    assert.equal((await Goal.findById(stored._id).lean()).status, "active");

    // Delete: asks first, can be cancelled, then removes the goal for good.
    await card(page, "Run 30 miles").getByRole("button", { name: "Delete" }).click();
    await card(page, "Run 30 miles").getByRole("button", { name: "Keep goal" }).click();
    assert.ok(await Goal.findById(stored._id));
    await card(page, "Run 30 miles").getByRole("button", { name: "Delete" }).click();
    await card(page, "Run 30 miles").getByRole("button", { name: "Delete goal" }).click();
    await page.getByRole("status").getByText('"Run 30 miles" deleted.').waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "No active goals yet" }).waitFor();
    assert.equal(await Goal.findById(stored._id), null);
  } finally {
    await context.close();
  }
});

serial("goals stay private between accounts and fit a phone screen", async () => {
  await Goal.deleteMany({});
  await Goal.create({ userId: accounts.alex.user.id, title: "Alex's private goal", category: "wellness", targetValue: 3, targetDate: daysFromNow(14) });

  const sam = await signedInPage("sam.goals@example.test", { width: 390, height: 844 });
  try {
    await sam.page.getByRole("heading", { name: "No active goals yet" }).waitFor();
    assert.equal(await sam.page.getByText("Alex's private goal").count(), 0);
  } finally {
    await sam.context.close();
  }

  const alex = await signedInPage("alex.goals@example.test", { width: 390, height: 844 });
  try {
    await card(alex.page, "Alex's private goal").waitFor();
    await alex.page.getByRole("button", { name: "New goal" }).click();
    assert.equal(await alex.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await new AxeBuilder({ page: alex.page }).analyze().then(({ violations }) => assert.deepEqual(violations.map((v) => v.id), []));
    await alex.page.screenshot({ path: path.join(artifacts, "goals-mobile.png"), fullPage: true });
  } finally {
    await alex.context.close();
  }
});
