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
const password = "Summary-test-418!";
const timeZone = "America/New_York";
// Thursday, October 29, 2026, at noon in New York. This week runs Monday, October 26, through Sunday, November 1.
const thursday = new Date("2026-10-29T16:00:00Z");
const contexts = [];
let database, mongoose, apiServer, vite, browser, api, base, accounts, now;
let User, Workout, NutritionLog, Goal;

const day = (key) => new Date(`${key}T00:00:00Z`);

async function request(endpoint, token, body) {
  const response = await fetch(api + endpoint, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, cache: response.headers.get("cache-control"), data: await response.json().catch(() => ({})) };
}
const summary = (account, zone = timeZone, extra = "") =>
  request(`/dashboard/summary?timeZone=${encodeURIComponent(zone)}${extra}`, accounts[account].token);

async function save(endpoint, account, body) {
  const result = await request(endpoint, accounts[account].token, { timeZone, ...body });
  assert.equal(result.status, 201, JSON.stringify(result.data));
}
const meal = (account, date, calories) =>
  save("/nutrition", account, { date, foodName: "Test meal", calories, protein: 10, carbohydrates: 20, fat: 5 });
// Saved straight to the collection so the creation time can be chosen.
const rawGoal = (account, fields) =>
  Goal.collection.insertOne({
    userId: new mongoose.Types.ObjectId(accounts[account].user.id),
    category: "wellness",
    status: "active",
    currentValue: 0,
    updatedAt: thursday,
    ...fields,
  });

// Alex's week: two meals that don't count (last Sunday, tomorrow) around four that do.
async function seedMeals() {
  for (const [date, calories] of [
    ["2026-10-25", 500],
    ["2026-10-26", 320.25],
    ["2026-10-27", 540],
    ["2026-10-27", 0],
    ["2026-10-29", 710.5],
    ["2026-10-30", 900],
    ["2026-11-02", 650],
  ]) {
    await meal("alex", date, calories);
  }
  await meal("sam", "2026-10-27", 9999);
}

// Alex's goals, soonest first: a tracked workout goal, two goals due the same day, a later goal, and a
// completed goal that is due before all of them. The two same-day goals are saved in the opposite order
// of their creation times, so only an explicit sort lists them in the right order.
async function seedGoals({ sleepProgress = 4 } = {}) {
  for (const date of ["2026-10-19", "2026-10-21", "2026-10-26", "2026-10-28"]) {
    await save("/workouts", "alex", { name: "Walk", date, durationMinutes: 30 });
  }
  await save("/goals", "alex", {
    title: "Walk 10 times", category: "workout", tracking: "workoutCount",
    startDate: "2026-10-20", targetValue: 10, targetDate: "2026-11-01",
  });
  await rawGoal("alex", { title: "Stretch every morning", targetValue: 30, unit: "days", targetDate: day("2026-11-03"), createdAt: day("2026-10-28") });
  await rawGoal("alex", { title: "Sleep by 11", targetValue: 7, currentValue: sleepProgress, unit: "nights", targetDate: day("2026-11-03"), createdAt: day("2026-10-20") });
  await save("/goals", "alex", { title: "Read before bed", category: "wellness", targetValue: 30, currentValue: 12, unit: "nights", targetDate: "2026-12-31" });
  await Goal.create({
    userId: accounts.alex.user.id, title: "Finished early", category: "wellness",
    targetValue: 1, currentValue: 1, targetDate: day("2026-10-30"), status: "completed",
  });
  await save("/goals", "sam", { title: "Sam's private goal", category: "wellness", targetValue: 3, targetDate: "2026-10-30" });
}

async function openDashboard(account, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, locale: "en-US", timezoneId: timeZone });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.clock.install({ time: now });
  await page.goto(base + "/login");
  await page.evaluate((token) => localStorage.setItem("fwt_token", token), accounts[account].token);
  await page.goto(base + "/dashboard");
  return page;
}

async function expectMeals(page, meals, calories) {
  await page.waitForFunction(
    (expected) => JSON.stringify([...document.querySelectorAll(".meals-summary .summary-metrics strong")].map((el) => el.textContent)) === expected,
    JSON.stringify([meals, calories]),
  );
}

async function expectGoals(page, titles) {
  await page.waitForFunction(
    (expected) => JSON.stringify([...document.querySelectorAll(".goals-summary h3")].map((el) => el.textContent)) === expected,
    JSON.stringify(titles),
  );
}

const goalItem = (page, title) => page.locator(".summary-goals li", { has: page.getByRole("heading", { name: title, exact: true }) });
const navigate = (page, name) => page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name, exact: true }).click();

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  ({ default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js"));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  ({ User } = await importLocal("backend/src/models/User.js"));
  ({ Workout } = await importLocal("backend/src/models/Workout.js"));
  ({ NutritionLog } = await importLocal("backend/src/models/NutritionLog.js"));
  ({ Goal } = await importLocal("backend/src/models/Goal.js"));
  const { default: auth } = await importLocal("backend/src/routes/auth.js");
  const { default: nutrition } = await importLocal("backend/src/routes/nutrition.js");
  const { createWorkoutRouter } = await importLocal("backend/src/routes/workouts.js");
  const { createGoalRouter } = await importLocal("backend/src/routes/goals.js");
  const { createDashboardRouter } = await importLocal("backend/src/routes/dashboard.js");
  const { errorHandler } = await importLocal("backend/src/middleware/errorHandler.js");
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/auth", auth);
  app.use("/api/workouts", createWorkoutRouter({ now: () => now }));
  app.use("/api/nutrition", nutrition);
  app.use("/api/goals", createGoalRouter({ now: () => now }));
  app.use("/api/dashboard", createDashboardRouter({ now: () => now }));
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
  await Promise.all([User.deleteMany({}), Workout.deleteMany({}), NutritionLog.deleteMany({}), Goal.deleteMany({})]);
  now = thursday;
  accounts = {};
  for (const [name, displayName] of [["alex", "Alex Morgan"], ["sam", "Sam Rivera"], ["casey", "Casey New"]]) {
    const result = await request("/auth/signup", null, { email: `${name}@example.test`, displayName, password, confirmPassword: password });
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

test("The dashboard summary requires a login, is never cached, and checks the time zone", async () => {
  for (const token of [undefined, "invalid", accounts.alex.token.slice(0, -2)]) {
    assert.equal((await request(`/dashboard/summary?timeZone=${timeZone}`, token)).status, 401);
  }
  const badZone = await summary("alex", "Not/AZone");
  assert.equal(badZone.status, 400);
  assert.equal(badZone.data.message, "Use a valid timezone.");
  const result = await summary("alex");
  assert.equal(result.status, 200);
  assert.equal(result.cache, "no-store");
});

test("Weekly nutrition counts this week's saved entries, Monday through today", async () => {
  await seedMeals();
  const thisWeek = await summary("alex");
  assert.equal(thisWeek.data.today, "2026-10-29");
  assert.deepEqual(thisWeek.data.nutrition, { weekStart: "2026-10-26", meals: 4, calories: 1570.75 });

  // Sunday at 11:30 PM in New York: Friday's meal now counts. In UTC it is already Monday, a new week.
  now = new Date("2026-11-02T04:30:00Z");
  assert.deepEqual((await summary("alex")).data.nutrition, { weekStart: "2026-10-26", meals: 5, calories: 2470.75 });
  assert.deepEqual((await summary("alex", "UTC")).data.nutrition, { weekStart: "2026-11-02", meals: 1, calories: 650 });

  now = new Date("2026-11-02T16:00:00Z");
  assert.deepEqual((await summary("alex")).data.nutrition, { weekStart: "2026-11-02", meals: 1, calories: 650 });
});

test("Active goals list the soonest three, leave out completed goals, and count tracked progress", async () => {
  await seedGoals();
  const { data } = await summary("alex");
  assert.deepEqual(data.goals.active.map((goal) => goal.title), ["Walk 10 times", "Sleep by 11", "Stretch every morning"]);
  assert.equal(data.goals.total, 4);
  const [walk, sleep] = data.goals.active;
  // Workouts from the start date on count: three of the four.
  assert.deepEqual([walk.tracking, walk.currentValue, walk.targetValue, walk.unit], ["workoutCount", 3, 10, "workouts"]);
  assert.deepEqual([sleep.tracking, sleep.currentValue, sleep.targetValue, sleep.unit], ["manual", 4, 7, "nights"]);
  for (const goal of data.goals.active) {
    assert.equal("userId" in goal || "status" in goal, false);
  }

  await Goal.updateOne({ title: "Walk 10 times" }, { status: "completed" });
  const after = (await summary("alex")).data.goals;
  assert.deepEqual(after.active.map((goal) => goal.title), ["Sleep by 11", "Stretch every morning", "Read before bed"]);
  assert.equal(after.total, 3);
});

test("Each account sees only its own meals and goals", async () => {
  await seedMeals();
  await seedGoals();
  const alex = await summary("alex");
  const spoofed = await summary("alex", timeZone, `&userId=${accounts.sam.user.id}`);
  assert.deepEqual(spoofed.data, alex.data);

  const sam = await summary("sam", timeZone, `&userId=${accounts.alex.user.id}`);
  assert.deepEqual(sam.data.nutrition, { weekStart: "2026-10-26", meals: 1, calories: 9999 });
  assert.deepEqual(sam.data.goals.active.map((goal) => goal.title), ["Sam's private goal"]);
  assert.equal(sam.data.goals.total, 1);

  const casey = await summary("casey");
  assert.deepEqual(casey.data.nutrition, { weekStart: "2026-10-26", meals: 0, calories: 0 });
  assert.deepEqual(casey.data.goals, { active: [], total: 0 });

  const page = await openDashboard("sam");
  await expectMeals(page, "1", "9,999");
  await expectGoals(page, ["Sam's private goal"]);
  const text = await page.locator("main").textContent();
  for (const hidden of ["Walk 10 times", "Sleep by 11", "Stretch every morning", "Read before bed"]) {
    assert.equal(text.includes(hidden), false, `${hidden} must not appear for another account`);
  }

  await writeFile(path.join(artifacts, "dashboard-summary-api-evidence.json"), JSON.stringify({
    environment: "Disposable MongoDB; generated test accounts; now fixed at 2026-10-29 noon in New York",
    checkedAt: new Date().toISOString(),
    alex: alex.data,
    alexWithSpoofedUserId: spoofed.data,
    sam: sam.data,
    newAccount: casey.data,
  }, null, 2));
});

test("Dashboard shows weekly meals and active goals on desktop and phone", async () => {
  await seedMeals();
  await seedGoals({ sleepProgress: 7 });
  await rawGoal("alex", { title: "Cook at home 5 times", category: "nutrition", targetValue: 5, currentValue: 3, unit: "meals", targetDate: day("2026-10-27"), createdAt: day("2026-10-01") });
  const page = await openDashboard("alex");

  await expectMeals(page, "4", "1,571");
  await page.locator(".meals-summary").getByText("Monday through today", { exact: false }).waitFor();
  await expectGoals(page, ["Cook at home 5 times", "Walk 10 times", "Sleep by 11"]);
  await goalItem(page, "Cook at home 5 times").getByText("Overdue since Oct 27, 2026", { exact: true }).waitFor();
  await goalItem(page, "Walk 10 times").getByText("3 / 10 workouts", { exact: true }).waitFor();
  await goalItem(page, "Walk 10 times").getByText("Due Nov 1, 2026", { exact: true }).waitFor();
  await goalItem(page, "Sleep by 11").getByText("Target reached", { exact: true }).waitFor();
  assert.equal(await goalItem(page, "Walk 10 times").getByText("Target reached").count(), 0);
  await page.locator(".goals-summary").getByText("2 more goals on the Goals page.", { exact: true }).waitFor();
  assert.equal(await page.locator(".goals-summary").getByRole("link", { name: "View all goals" }).getAttribute("href"), "/goals");
  assert.equal(await page.locator(".meals-summary").getByRole("link", { name: "View meals" }).getAttribute("href"), "/nutrition");

  // The workout widgets, Deep Insight, and the AI insight are still on the page.
  await page.getByRole("heading", { name: "Your weekly rhythm" }).waitFor();
  await page.getByRole("button", { name: "Deep Insight" }).waitFor();
  await page.getByRole("heading", { name: "What your recent habits say" }).waitFor();

  const audit = await new AxeBuilder({ page }).include(".summary-row").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(audit.violations.map((violation) => violation.id), []);
  await page.screenshot({ path: path.join(artifacts, "dashboard-summary-desktop.png"), fullPage: true });

  for (const viewport of [{ width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 320, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(overflow, 0, `no horizontal scroll at ${viewport.width}px`);
    for (const box of await page.locator(".summary-row a").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height))) {
      assert.ok(box >= 44, `links stay at least 44px tall at ${viewport.width}px`);
    }
    const { violations } = await new AxeBuilder({ page }).include(".summary-row").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    assert.deepEqual(violations.map((violation) => violation.id), [], `no axe violations at ${viewport.width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".summary-row").screenshot({ path: path.join(artifacts, "dashboard-summary-mobile.png") });
});

test("Accounts without meals this week or active goals see empty states", async () => {
  const page = await openDashboard("casey", { width: 390, height: 844 });
  const meals = page.locator(".meals-summary");
  const goals = page.locator(".goals-summary");
  await meals.getByText("No meals logged this week.", { exact: true }).waitFor();
  await goals.getByText("No active goals right now.", { exact: true }).waitFor();
  assert.equal(await meals.getByRole("link", { name: "Log a meal" }).getAttribute("href"), "/nutrition");
  assert.equal(await goals.getByRole("link", { name: "Set a goal" }).getAttribute("href"), "/goals");
  const audit = await new AxeBuilder({ page }).include(".summary-row").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(audit.violations.map((violation) => violation.id), []);
  await page.locator(".summary-row").screenshot({ path: path.join(artifacts, "dashboard-summary-empty-mobile.png") });

  // Only last week's meal and a completed goal: still nothing to show this week, after a browser refresh too.
  await meal("casey", "2026-10-25", 400);
  await Goal.create({ userId: accounts.casey.user.id, title: "Done already", category: "wellness", targetValue: 1, currentValue: 1, targetDate: day("2026-11-05"), status: "completed" });
  await page.reload();
  await meals.getByText("No meals logged this week.", { exact: true }).waitFor();
  await goals.getByText("No active goals right now.", { exact: true }).waitFor();
  assert.equal(await page.getByText("Done already").count(), 0);
});

test("Dashboard updates after saving on the Nutrition and Goals pages and in other tabs", async () => {
  await seedMeals();
  await seedGoals();
  const page = await openDashboard("alex");
  await expectMeals(page, "4", "1,571");

  await navigate(page, "Nutrition");
  for (const [field, value] of Object.entries({ date: "2026-10-29", foodName: "Lentil soup", calories: "200", protein: "12", carbohydrates: "30", fat: "4" })) {
    await page.locator(`#nutrition-${field}`).fill(value);
  }
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByText("Entry saved.", { exact: true }).waitFor();
  await navigate(page, "Dashboard");
  await expectMeals(page, "5", "1,771");

  await navigate(page, "Goals");
  const sleep = page.locator(".goal-card", { has: page.getByRole("heading", { name: "Sleep by 11", exact: true }) });
  await sleep.getByRole("button", { name: "Mark complete" }).click();
  await page.getByText('"Sleep by 11" marked complete.').waitFor();
  await navigate(page, "Dashboard");
  await expectGoals(page, ["Walk 10 times", "Stretch every morning", "Read before bed"]);
  assert.equal(await page.locator(".goals-summary").getByText(/more goals? on the Goals page/).count(), 0);

  // Saved somewhere else (another tab or device), then the user comes back to this tab.
  await meal("alex", "2026-10-28", 300);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expectMeals(page, "6", "2,071");
});

test("Refresh, workout changes, and the once-a-minute check update the cards", async () => {
  await seedMeals();
  await seedGoals();
  const page = await openDashboard("alex");
  await expectMeals(page, "4", "1,571");
  await goalItem(page, "Walk 10 times").getByText("3 / 10 workouts", { exact: true }).waitFor();

  await meal("alex", "2026-10-29", 99.5);
  await save("/goals", "alex", { title: "Due tomorrow", category: "wellness", targetValue: 1, targetDate: "2026-10-30" });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expectMeals(page, "5", "1,670");
  await expectGoals(page, ["Due tomorrow", "Walk 10 times", "Sleep by 11"]);

  // Removing a counted workout from the dashboard's recent list lowers the tracked goal.
  await page.getByRole("button", { name: "Remove Walk" }).first().click();
  await page.getByRole("dialog", { name: "Remove this session?" }).getByRole("button", { name: "Remove session", exact: true }).click();
  await goalItem(page, "Walk 10 times").getByText("2 / 10 workouts", { exact: true }).waitFor();

  // A workout saved in another tab raises it again.
  await save("/workouts", "alex", { name: "Walk", date: "2026-10-29", durationMinutes: 20 });
  const sibling = await page.context().newPage();
  await sibling.goto(base + "/login");
  await sibling.evaluate(() => localStorage.setItem("fwt_workouts_changed", String(Date.now())));
  await goalItem(page, "Walk 10 times").getByText("3 / 10 workouts", { exact: true }).waitFor();
  await sibling.close();

  // Saved somewhere that sends no signal: the once-a-minute check finds it.
  await meal("alex", "2026-10-28", 30);
  await page.clock.runFor(61_000);
  await expectMeals(page, "6", "1,700");
});

test("Summary errors are shown plainly, recover on retry, and an expired session hides the numbers", async () => {
  await seedMeals();
  const page = await (async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-US", timezoneId: timeZone });
    contexts.push(context);
    await context.route("**/api/dashboard/summary?*", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    const opened = await context.newPage();
    await opened.clock.install({ time: now });
    await opened.goto(base + "/login");
    await opened.evaluate((token) => localStorage.setItem("fwt_token", token), accounts.alex.token);
    await opened.goto(base + "/dashboard");
    return opened;
  })();
  const error = page.locator(".summary-error");
  await error.getByText("Couldn’t load your meals and goals.").waitFor();
  assert.equal(await error.getAttribute("role"), "alert");
  assert.equal(await page.locator(".summary-row").count(), 0);
  await page.getByRole("heading", { name: "Your weekly rhythm" }).waitFor();

  await page.context().unroute("**/api/dashboard/summary?*");
  await error.getByRole("button", { name: "Try again" }).click();
  await expectMeals(page, "4", "1,571");
  assert.equal(await error.count(), 0);

  await page.context().route("**/api/dashboard/summary?*", (route) => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.locator(".meals-summary").waitFor({ state: "detached" });
  assert.equal(await error.count(), 0);
});
