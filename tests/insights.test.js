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
const password = "Insight-test-731!";
const timeZone = "America/New_York";
const realFetch = globalThis.fetch;
const contexts = [];
let database, mongoose, apiServer, vite, browser, api, base, accounts, today;
let User, Workout, NutritionLog, Goal;
let providerStatus, providerReply, insightRequests;

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const day = (offset) => new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000);

async function request(endpoint, token, body) {
  const response = await fetch(api + endpoint, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    cache: response.headers.get("cache-control"),
    retryAfter: response.headers.get("retry-after"),
    data: await response.json().catch(() => ({})),
  };
}

// A grounded reply built only from the summary the backend sent, like a well-behaved model.
function groundedReply(summary) {
  const { workouts, nutrition, goals } = summary;
  const [goal] = goals.active;
  return {
    headline: `You moved on ${workouts.activeDays} different days over the last ${summary.periodDays} days.`,
    observations: [
      { topic: "consistency", text: `You logged ${workouts.sessions} workouts, most often ${workouts.topActivities[0].name} (${workouts.topActivities[0].sessions} sessions).` },
      { topic: "trends", text: `The most recent week had ${workouts.sessionsPerWeek[3]} sessions, up from ${workouts.sessionsPerWeek[2]} the week before.` },
      { topic: "nutrition", text: `You logged ${nutrition.entries} meals on ${nutrition.daysLogged} day, averaging ${nutrition.averagePerLoggedDay.calories} kcal on the days you logged.` },
      { topic: "goals", text: `${goal.title} is ${goal.progressPercent}% complete with ${goal.daysLeft} days to go.` },
    ],
  };
}

async function seedAlex() {
  const userId = accounts.alex.user.id;
  await Workout.create([
    { userId, name: "Walk", date: day(0), durationMinutes: 30, notes: "Knee felt sore" },
    { userId, name: "Walk", date: day(-2), durationMinutes: 25 },
    { userId, name: "Yoga", date: day(-9), durationMinutes: 40 },
  ]);
  await NutritionLog.create([
    { userId, foodName: "Oatmeal", date: day(-1), calories: 420, protein: 18, carbohydrates: 62, fat: 11 },
    { userId, foodName: "Chicken bowl", date: day(-1), calories: 640, protein: 42, carbohydrates: 70, fat: 18 },
  ]);
  await Goal.create({
    userId,
    title: "Move 12 times",
    category: "workout",
    targetValue: 12,
    unit: "workouts",
    tracking: "workoutCount",
    startDate: day(-20),
    targetDate: day(10),
  });
}

async function openDashboard(account, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, locale: "en-US", timezoneId: timeZone });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.goto(base + "/dashboard");
  await page.getByLabel("Email").fill(`${account}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("heading", { name: "What your recent habits say" }).waitFor();
  return page;
}

before(async () => {
  process.env.GEMINI_API_KEY = "integration-test-key-never-real";
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith("https://generativelanguage.googleapis.com/")) return realFetch(url, options);
    const body = JSON.parse(options.body);
    if (body.generationConfig.responseSchema.properties.isFood) {
      const meal = { isFood: true, portion: "One bowl", calories: 207, protein: 8.4, carbohydrates: 33.8, fat: 3.9 };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(meal) }] } }] }) };
    }
    const sent = body.contents[0].parts[0].text;
    insightRequests.push(sent);
    if (providerStatus !== 200) return { ok: false, status: providerStatus };
    const reply = providerReply ? providerReply(JSON.parse(sent)) : groundedReply(JSON.parse(sent));
    return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(reply) }] } }] }) };
  };
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
  await Promise.all([User.deleteMany({}), Workout.deleteMany({}), NutritionLog.deleteMany({}), Goal.deleteMany({})]);
  today = todayKey();
  providerStatus = 200;
  providerReply = null;
  insightRequests = [];
  accounts = {};
  for (const name of ["alex", "sam"]) {
    const result = await request("/auth/signup", null, { email: `${name}@example.test`, displayName: name === "alex" ? "Alex Morgan" : "Sam Rivera", password, confirmPassword: password });
    assert.equal(result.status, 201);
    accounts[name] = result.data;
  }
});
afterEach(async () => { await Promise.all(contexts.splice(0).map((context) => context.close())); });
after(async () => {
  globalThis.fetch = realFetch;
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

test("Insights require a valid login and are never cached", async () => {
  for (const token of [undefined, "invalid", accounts.alex.token.slice(0, -2)]) {
    assert.equal((await request("/insights", token, { timeZone })).status, 401);
  }
  assert.equal((await request("/insights", accounts.alex.token, { timeZone: "Not/AZone" })).status, 400);
  const result = await request("/insights", accounts.alex.token, { timeZone });
  assert.equal(result.cache, "no-store");
  assert.equal(insightRequests.length, 0);
});

test("Insights summarize only the signed-in user's saved records on the server", async () => {
  await seedAlex();
  await Workout.create({ userId: accounts.sam.user.id, name: "Sam secret ride", date: day(0), durationMinutes: 90 });

  const alex = await request("/insights", accounts.alex.token, { timeZone, userId: accounts.sam.user.id });
  assert.equal(alex.status, 200);
  assert.equal(alex.data.status, "ready");
  assert.equal(insightRequests.length, 1);

  const sent = JSON.parse(insightRequests[0]);
  assert.equal(sent.workouts.sessions, 3);
  assert.equal(sent.workouts.minutesRecorded, 95);
  assert.deepEqual(sent.nutrition.averagePerLoggedDay, { calories: 1060, protein: 60, carbohydrates: 132, fat: 29 });
  assert.equal(sent.goals.active[0].current, 3);
  for (const hidden of ["Sam secret ride", "Knee felt sore", "Oatmeal", "alex@example.test", "Alex Morgan", accounts.alex.user.id]) {
    assert.equal(insightRequests[0].includes(hidden), false, `${hidden} must not reach Gemini`);
  }

  assert.deepEqual(alex.data.basedOn, { periodDays: 28, workouts: 3, nutritionEntries: 2, activeGoals: 1, completedGoals: 0 });
  assert.deepEqual(alex.data.observations.map((item) => item.topic), ["consistency", "trends", "nutrition", "goals"]);
  assert.match(alex.data.observations[3].text, /Move 12 times is 25% complete with 10 days to go/);
  assert.equal(JSON.stringify(alex.data).includes("integration-test-key"), false);

  const sam = await request("/insights", accounts.sam.token, { timeZone, userId: accounts.alex.user.id });
  assert.equal(sam.data.status, "limited");
  assert.match(sam.data.message, /You have 1 saved record from the last 28 days/);
  assert.equal(sam.data.basedOn.workouts, 1);
  assert.equal(insightRequests.length, 1);

  await writeFile(path.join(artifacts, "insights-api-evidence.json"), JSON.stringify({
    environment: "Disposable MongoDB; generated test accounts; mocked Gemini reply built from the summary",
    checkedAt: new Date().toISOString(),
    summarySentToGemini: sent,
    insightResponse: alex.data,
    otherUserResponse: sam.data,
  }, null, 2));
});

test("Users without enough saved data get a plain message and no Gemini call", async () => {
  const empty = await request("/insights", accounts.sam.token, { timeZone });
  assert.equal(empty.status, 200);
  assert.equal(empty.data.status, "limited");
  assert.match(empty.data.message, /nothing saved yet/);
  assert.equal(empty.data.observations, undefined);

  // Records older than the 28-day window don't count toward an insight.
  await Workout.create({ userId: accounts.sam.user.id, name: "Old run", date: day(-40), durationMinutes: 30 });
  assert.match((await request("/insights", accounts.sam.token, { timeZone })).data.message, /nothing saved yet/);
  assert.equal(insightRequests.length, 0);
});

test("Dashboard shows a personalized insight from saved data on desktop and phone", async () => {
  await seedAlex();
  const page = await openDashboard("alex");
  const card = page.locator(".wellness-insight");
  await card.getByRole("button", { name: "Get my insight" }).click();
  await card.getByText("You moved on 3 different days over the last 28 days.").waitFor();
  for (const label of ["Workout consistency", "Activity trends", "Nutrition logging", "Goal progress"]) {
    await card.getByText(label, { exact: true }).waitFor();
  }
  await card.getByText("Based on 3 workouts, 2 nutrition entries, and 1 goal from the last 28 days.").waitFor();
  await card.getByText("not medical advice", { exact: false }).waitFor();
  await card.getByRole("button", { name: "Refresh insight" }).waitFor();

  const audit = await new AxeBuilder({ page }).include(".wellness-insight").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(audit.violations.map((violation) => violation.id), []);
  await card.screenshot({ path: path.join(artifacts, "insights-desktop.png") });

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(overflow, 0, `no horizontal scroll at ${viewport.width}px`);
    const button = await card.getByRole("button", { name: "Refresh insight" }).boundingBox();
    assert.ok(button.height >= 44, "touch target stays at least 44px tall");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await card.screenshot({ path: path.join(artifacts, "insights-mobile.png") });
});

test("Dashboard explains when there is not enough data yet", async () => {
  const page = await openDashboard("sam", { width: 390, height: 844 });
  const card = page.locator(".wellness-insight");
  await card.getByRole("button", { name: "Get my insight" }).click();
  await card.getByText("There's nothing saved yet to learn from.", { exact: false }).waitFor();
  assert.equal(await card.locator(".insight-observations").count(), 0);
  await card.screenshot({ path: path.join(artifacts, "insights-limited-mobile.png") });
  assert.equal(insightRequests.length, 0);
});

test("Meal estimates keep working next to insights", async () => {
  const estimate = await request("/nutrition/estimate", accounts.alex.token, { foodName: "Oatmeal" });
  assert.equal(estimate.status, 200);
  assert.deepEqual(estimate.data.values, { calories: 207, protein: 8.4, carbohydrates: 33.8, fat: 3.9 });
  assert.ok(estimate.data.receipt);
});

// Runs last: a provider rate limit pauses insights for every user for a minute.
test("Insight failures are reported plainly, and rate limits pause further requests", async () => {
  await seedAlex();
  await Workout.create(["Walk", "Run", "Cycle"].map((name) => ({ userId: accounts.sam.user.id, name, date: day(0), durationMinutes: 20 })));

  process.env.GEMINI_API_KEY = "";
  const unconfigured = await request("/insights", accounts.alex.token, { timeZone });
  process.env.GEMINI_API_KEY = "integration-test-key-never-real";
  assert.equal(unconfigured.status, 503);
  assert.equal(insightRequests.length, 0);

  providerReply = () => ({ headline: "You trained 17 times.", observations: [{ topic: "consistency", text: "You ran 9 marathons." }] });
  const invented = await request("/insights", accounts.alex.token, { timeZone });
  assert.equal(invented.status, 502);
  assert.equal(invented.data.headline, undefined);

  providerStatus = 500;
  const unavailable = await request("/insights", accounts.alex.token, { timeZone });
  assert.equal(unavailable.status, 503);
  assert.equal(JSON.stringify(unavailable.data).includes("integration-test-key"), false);

  // Alex has used the three requests allowed per minute, so Sam meets the provider limit.
  providerStatus = 429;
  const page = await openDashboard("sam", { width: 390, height: 844 });
  const card = page.locator(".wellness-insight");
  await card.getByRole("button", { name: "Get my insight" }).click();
  await card.getByRole("alert").getByText("AI insight limit reached. Try again in a minute.").waitFor();
  await card.getByRole("button", { name: /Try again in \d+s/ }).waitFor();
  assert.ok(await card.getByRole("button", { name: /Try again in/ }).isDisabled());
  await card.screenshot({ path: path.join(artifacts, "insights-rate-limit-mobile.png") });

  const callsBefore = insightRequests.length;
  const paused = await request("/insights", accounts.alex.token, { timeZone });
  assert.equal(paused.status, 429);
  assert.match(paused.data.message, /resting/);
  assert.ok(Number(paused.retryAfter) > 0);
  assert.equal(paused.data.retryAfterSeconds, Number(paused.retryAfter));
  assert.equal(insightRequests.length, callsBefore);
});
