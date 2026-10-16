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
// The same, but in the test timezone: the day the browser and the goal progress count call "today".
const localDay = (days) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(Date.now() + days * 86_400_000));
const goalBody = (overrides = {}) => ({
  title: "Run 20 miles",
  category: "workout",
  targetValue: 20,
  unit: "miles",
  targetDate: daysFromNow(30),
  timeZone,
  ...overrides,
});
let database, mongoose, apiServer, vite, browser, api, base, accounts, Goal, Workout;

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

async function signup(email) {
  const result = await request("/auth/signup", null, { email, password, confirmPassword: password });
  assert.equal(result.status, 201);
  return result.data;
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
  ({ Workout } = await importLocal("backend/src/models/Workout.js"));
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

// ---- Goal progress: workout goals counted from saved workouts ----
// These run in order after the tests above (see `serial`), so run the whole file:
// node --test tests/goals.test.js

const withZone = `timeZone=${encodeURIComponent(timeZone)}`;
// A goal that counts workouts from 10 days ago through 20 days from now.
const trackedBody = (overrides = {}) => goalBody({
  title: "Work out 10 times",
  targetValue: 10,
  tracking: "workoutCount",
  startDate: localDay(-10),
  targetDate: localDay(20),
  ...overrides,
});
// Each goal's title and the progress the API reports for it.
async function progressByTitle(token, status = "active") {
  const result = await request(`/goals?status=${status}&${withZone}`, token);
  assert.equal(result.status, 200);
  return Object.fromEntries(result.data.goals.map((goal) => [goal.title, goal.currentValue]));
}

serial("Goal progress API counts only the user's own workouts within each goal's dates", async () => {
  const pat = await signup("pat.progress@example.test");
  const kim = await signup("kim.progress@example.test");

  // Tracked goals must be workout goals with a start date no later than the target date.
  for (const [overrides, field, message] of [
    [{ category: "nutrition" }, "tracking", "Only workout goals can count your workouts."],
    [{ tracking: "steps" }, "tracking", "Choose manual, workout count, or workout minutes."],
    [{ startDate: "" }, "startDate", "Choose a start date."],
    [{ startDate: localDay(21) }, "startDate", "Choose a start date on or before the target date."],
  ]) {
    const rejected = await request("/goals", pat.token, trackedBody(overrides));
    assert.equal(rejected.status, 400, JSON.stringify(overrides));
    assert.equal(rejected.data.errors[field], message);
  }
  assert.equal(await Goal.countDocuments({ userId: pat.user.id }), 0);

  // The unit is set by the server, and progress sent by the browser is ignored.
  const count = await request("/goals", pat.token, trackedBody({ unit: "miles", currentValue: 99 }));
  assert.equal(count.status, 201);
  assert.equal(count.data.goal.unit, "workouts");
  assert.equal(count.data.goal.currentValue, 0);
  const minutes = await request("/goals", pat.token, trackedBody({ title: "Move 120 minutes", targetValue: 120, tracking: "workoutMinutes" }));
  assert.equal(minutes.data.goal.unit, "minutes");

  // Only Pat's workouts from the start date through today count. A workout without a
  // duration counts as a workout but adds no minutes.
  await Workout.insertMany([
    { userId: pat.user.id, name: "Before the start date", date: localDay(-15), durationMinutes: 50 },
    { userId: pat.user.id, name: "Run", date: localDay(-6), durationMinutes: 30 },
    { userId: pat.user.id, name: "Swim", date: localDay(-3), durationMinutes: 45.5 },
    { userId: pat.user.id, name: "Walk without a duration", date: localDay(-1) },
    { userId: pat.user.id, name: "Planned for later", date: localDay(3), durationMinutes: 60 },
    { userId: kim.user.id, name: "Kim's run", date: localDay(-3), durationMinutes: 999 },
  ]);
  assert.deepEqual(await progressByTitle(pat.token), { "Work out 10 times": 3, "Move 120 minutes": 75.5 });
  // Progress is counted when goals load; nothing is written back to the goal.
  assert.equal((await Goal.findById(count.data.goal._id).lean()).currentValue, 0);

  // Kim sees none of Pat's goals and can't change them.
  assert.deepEqual(await progressByTitle(kim.token), {});
  assert.equal((await request(`/goals/${count.data.goal._id}`, kim.token, trackedBody(), "PUT")).status, 404);

  // No timezone falls back to UTC; an invalid one is refused.
  assert.equal((await request("/goals", pat.token)).status, 200);
  assert.equal((await request("/goals?timeZone=Not%2FAZone", pat.token)).status, 400);

  // A goal saved before tracking existed loads as manual with its saved progress.
  await Goal.collection.insertOne({
    userId: new mongoose.Types.ObjectId(pat.user.id),
    title: "Goal from before tracking",
    category: "wellness",
    targetValue: 8,
    currentValue: 2,
    targetDate: new Date(`${localDay(9)}T00:00:00Z`),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const legacy = (await request(`/goals?${withZone}`, pat.token)).data.goals.find((goal) => goal.title === "Goal from before tracking");
  assert.equal(legacy.tracking, "manual");
  assert.equal(legacy.currentValue, 2);
});

serial("Goal progress API follows workout changes, completion, and switching back to manual", async () => {
  const ray = await signup("ray.progress@example.test");
  const count = (await request("/goals", ray.token, trackedBody())).data.goal;
  const minutes = (await request("/goals", ray.token, trackedBody({ title: "Move 120 minutes", targetValue: 120, tracking: "workoutMinutes" }))).data.goal;
  await Workout.create({ userId: ray.user.id, name: "Run", date: localDay(-2), durationMinutes: 30 });
  assert.deepEqual(await progressByTitle(ray.token), { "Work out 10 times": 1, "Move 120 minutes": 30 });

  // Adding, editing, and deleting a workout show up the next time goals load.
  const workout = { name: "Evening ride", date: localDay(0), durationMinutes: 20, timeZone };
  const added = await request("/workouts", ray.token, workout);
  assert.equal(added.status, 201);
  assert.deepEqual(await progressByTitle(ray.token), { "Work out 10 times": 2, "Move 120 minutes": 50 });
  const rideId = added.data.workout._id;
  assert.equal((await request(`/workouts/${rideId}`, ray.token, { ...workout, durationMinutes: 45 }, "PUT")).status, 200);
  assert.deepEqual(await progressByTitle(ray.token), { "Work out 10 times": 2, "Move 120 minutes": 75 });
  assert.equal((await request(`/workouts/${rideId}`, ray.token, undefined, "DELETE")).status, 204);
  assert.deepEqual(await progressByTitle(ray.token), { "Work out 10 times": 1, "Move 120 minutes": 30 });

  // Completing keeps the real count and moves the goal to the completed list.
  const completed = await request(`/goals/${count._id}`, ray.token, trackedBody({ status: "completed" }), "PUT");
  assert.equal(completed.status, 200);
  assert.equal(completed.data.goal.currentValue, 1);
  assert.deepEqual(await progressByTitle(ray.token), { "Move 120 minutes": 30 });
  assert.deepEqual(await progressByTitle(ray.token, "completed"), { "Work out 10 times": 1 });
  const storedCompleted = await Goal.findById(count._id).lean();
  assert.equal(storedCompleted.status, "completed");
  assert.equal(storedCompleted.tracking, "workoutCount");

  // An update that leaves out tracking keeps it.
  const minutesBody = trackedBody({ title: "Move 120 minutes", targetValue: 120, tracking: undefined });
  const kept = await request(`/goals/${minutes._id}`, ray.token, minutesBody, "PUT");
  assert.equal(kept.data.goal.tracking, "workoutMinutes");
  assert.equal(kept.data.goal.currentValue, 30);

  // Switching back to manual saves the progress sent and removes the start date.
  const manual = await request(`/goals/${minutes._id}`, ray.token, { ...minutesBody, tracking: "manual", currentValue: 50, unit: "minutes" }, "PUT");
  assert.equal(manual.status, 200);
  assert.equal(manual.data.goal.currentValue, 50);
  const storedManual = await Goal.findById(minutes._id).lean();
  assert.equal(storedManual.tracking, "manual");
  assert.equal(storedManual.currentValue, 50);
  assert.equal("startDate" in storedManual, false);
});

serial("Goal progress page shows counted progress and badges and updates from another tab", async () => {
  const lee = await signup("lee.progress@example.test");
  await Workout.insertMany([
    { userId: lee.user.id, name: "Run", date: localDay(-4), durationMinutes: 30 },
    { userId: lee.user.id, name: "Ride", date: localDay(-2), durationMinutes: 40 },
  ]);
  await request("/goals", lee.token, trackedBody({ title: "Move 60 minutes", targetValue: 60, tracking: "workoutMinutes", startDate: localDay(-7), targetDate: localDay(10) }));
  await request("/goals", lee.token, goalBody({ title: "Drink 8 glasses", category: "wellness", targetValue: 8, unit: "glasses", currentValue: 3, targetDate: localDay(10) }));

  const { context, page } = await signedInPage("lee.progress@example.test");
  // Every goal list request should say which timezone "today" is in.
  const listZones = [];
  page.on("request", (sent) => {
    if (sent.url().includes("/api/goals?")) listZones.push(new URL(sent.url()).searchParams.get("timeZone"));
  });
  try {
    // A tracked goal past its target has a badge and no slider; the manual goal keeps its slider.
    await card(page, "Move 60 minutes").getByText("70 / 60 minutes").waitFor();
    await card(page, "Move 60 minutes").getByText("Target reached").waitFor();
    assert.equal(await card(page, "Move 60 minutes").getByRole("slider").count(), 0);
    assert.equal(await card(page, "Drink 8 glasses").getByRole("slider").count(), 1);

    // Create a goal that counts workouts.
    await page.getByRole("button", { name: "New goal" }).click();
    await page.getByLabel("Goal name").fill("Work out 5 times");
    await page.getByLabel("Track progress").selectOption("workoutCount");
    assert.equal(await page.getByLabel("Start date").inputValue(), localDay(0));
    assert.equal(await page.getByLabel("Unit (optional)").count(), 0);
    await page.getByLabel("Start date").fill(localDay(-7));
    await page.getByLabel("Target workouts").fill("5");
    await page.getByLabel("Target date").fill(localDay(14));
    await page.getByRole("button", { name: "Add goal" }).click();
    await page.getByRole("status").getByText("Goal added.").waitFor();
    const workouts = card(page, "Work out 5 times");
    await workouts.getByText("2 / 5 workouts").waitFor();
    await workouts.getByText("Counting your workouts from").waitFor();
    const stored = await Goal.findOne({ title: "Work out 5 times" }).lean();
    assert.equal(String(stored.userId), lee.user.id);
    assert.equal(stored.tracking, "workoutCount");
    assert.equal(stored.unit, "workouts");
    assert.equal(stored.startDate.toISOString().slice(0, 10), localDay(-7));
    await new AxeBuilder({ page }).analyze().then(({ violations }) => assert.deepEqual(violations.map((v) => v.id), []));
    await page.screenshot({ path: path.join(artifacts, "goal-progress-desktop.png"), fullPage: true });

    // Log a workout in another tab: this tab updates without a reload.
    const workoutsTab = await context.newPage();
    await workoutsTab.goto(base + "/workouts");
    await workoutsTab.getByRole("button", { name: "Custom", exact: true }).click();
    await workoutsTab.getByLabel("Workout name").fill("Evening run");
    await workoutsTab.getByLabel("Minutes", { exact: false }).fill("25");
    await workoutsTab.getByRole("button", { name: "Save workout" }).click();
    await workouts.getByText("3 / 5 workouts").waitFor();
    await card(page, "Move 60 minutes").getByText("95 / 60 minutes").waitFor();
    await workoutsTab.close();
    assert.ok(listZones.length >= 2);
    assert.ok(listZones.every((zone) => zone === timeZone), JSON.stringify(listZones));

    // Complete: the goal moves to Completed with its badge and real count.
    await workouts.getByRole("button", { name: "Mark complete" }).click();
    await page.getByRole("status").getByText('"Work out 5 times" marked complete.').waitFor();
    await page.getByRole("button", { name: "Completed", exact: true }).click();
    await workouts.getByText("Completed", { exact: true }).waitFor();
    await workouts.getByText("3 / 5 workouts").waitFor();
    const completed = await Goal.findById(stored._id).lean();
    assert.equal(completed.status, "completed");
    assert.equal(completed.tracking, "workoutCount");
    await new AxeBuilder({ page }).analyze().then(({ violations }) => assert.deepEqual(violations.map((v) => v.id), []));
    await page.screenshot({ path: path.join(artifacts, "goal-progress-completed.png"), fullPage: true });

    // Phone layout: tracked cards and the tracked form fit without sideways scrolling.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Active", exact: true }).click();
    await card(page, "Move 60 minutes").waitFor();
    await page.getByRole("button", { name: "New goal" }).click();
    await page.getByLabel("Track progress").selectOption("workoutMinutes");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await new AxeBuilder({ page }).analyze().then(({ violations }) => assert.deepEqual(violations.map((v) => v.id), []));
    await page.screenshot({ path: path.join(artifacts, "goal-progress-mobile.png"), fullPage: true });
  } finally {
    await context.close();
  }
});
