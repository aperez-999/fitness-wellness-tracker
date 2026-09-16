import assert from "node:assert/strict";
import {
  after,
  afterEach,
  before,
  beforeEach,
  test as nodeTest,
} from "node:test";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { MongoMemoryServer } from "mongodb-memory-server";

const test = (name, run) => nodeTest(name, { timeout: 60_000 }, run);

const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const password = "Dashboard-test-902!";
const now = new Date("2026-09-19T16:00:00Z");
const artifacts = path.join(root, "tests/artifacts");
let database,
  mongoose,
  apiServer,
  vite,
  browser,
  api,
  base,
  accounts,
  Workout,
  User;
const contexts = [];

async function request(endpoint, token, body) {
  const response = await fetch(api + endpoint, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

async function save(
  name,
  date,
  durationMinutes,
  notes,
  token = accounts.alex.token,
) {
  const result = await request("/workouts", token, {
    name,
    date,
    durationMinutes,
    notes,
    timeZone: "America/New_York",
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data.workout;
}

async function openPage(route = "/dashboard", configure) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    timezoneId: "America/New_York",
    locale: "en-US",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  await page.clock.install({ time: now });
  await page.goto(base + "/login");
  await page.evaluate(
    (token) => localStorage.setItem("fwt_token", token),
    accounts.alex.token,
  );
  if (configure) await configure(page);
  await page.goto(base + route);
  return page;
}

async function expectCount(page, count) {
  await page.waitForFunction(
    (value) =>
      document.querySelector(".weekly-total strong")?.textContent ===
      String(value),
    count,
  );
}

const summaryPattern = "**/api/workouts/summary?*";
const listPattern = /\/api\/workouts\?(?:date=[^&]+)?$/;
const response = (status) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify({ message: "Test response" }),
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

before(
  async () => {
    process.env.JWT_SECRET = randomBytes(32).toString("hex");
    const { default: express } = await importLocal(
      "backend/node_modules/express/index.js",
    );
    const { default: cors } = await importLocal(
      "backend/node_modules/cors/lib/index.js",
    );
    ({ default: mongoose } = await importLocal(
      "backend/node_modules/mongoose/index.js",
    ));
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri());
    ({ Workout } = await importLocal("backend/src/models/Workout.js"));
    ({ User } = await importLocal("backend/src/models/User.js"));
    const { default: auth } = await importLocal("backend/src/routes/auth.js");
    const { createWorkoutRouter } = await importLocal(
      "backend/src/routes/workouts.js",
    );
    const { errorHandler } = await importLocal(
      "backend/src/middleware/errorHandler.js",
    );
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/auth", auth);
    app.use("/api/workouts", createWorkoutRouter({ now: () => now }));
    app.use(errorHandler);
    apiServer = await new Promise((resolve) => {
      const server = app.listen(0, "127.0.0.1", () => resolve(server));
    });
    api = `http://127.0.0.1:${apiServer.address().port}/api`;
    process.env.VITE_API_URL = api;
    const { createServer } = await importLocal(
      "frontend/node_modules/vite/dist/node/index.js",
    );
    vite = await createServer({
      root: path.join(root, "frontend"),
      configFile: path.join(root, "frontend/vite.config.js"),
      server: { port: 0, host: "127.0.0.1" },
    });
    await vite.listen();
    base = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const channel =
      process.env.TEST_BROWSER_CHANNEL ||
      (process.platform === "win32" ? "msedge" : undefined);
    browser = await chromium.launch({ channel, headless: true });
    await mkdir(artifacts, { recursive: true });
  },
  { timeout: 120_000 },
);

beforeEach(async () => {
  // These collections belong only to the disposable database created above.
  await Promise.all([Workout.deleteMany({}), User.deleteMany({})]);
  accounts = {};
  for (const [key, displayName] of [
    ["alex", "Alex Morgan"],
    ["sam", "Sam Rivera"],
    ["empty", "New member"],
  ]) {
    const result = await request("/auth/signup", null, {
      email: `${key}@example.test`,
      displayName,
      password,
      confirmPassword: password,
    });
    assert.equal(result.status, 201);
    accounts[key] = result.data;
  }
  await save(
    "Morning strength",
    "2026-09-14",
    30,
    "A steady start to the week",
  );
  await save("Evening walk", "2026-09-15", 42, "Around the neighborhood");
  await save("Yoga & mobility", "2026-09-16", 25, "Time to stretch and reset");
  await save(
    "Full body session",
    "2026-09-18",
    30,
    "A little stronger\nOne session at a time.",
  );
  // Preserve coverage for older records created before duration became required.
  await Workout.create({
    userId: accounts.alex.user.id,
    name: "Sunday recovery",
    date: "2026-09-13",
    notes: "Easy movement",
  });
  await save(
    "Private Sam workout",
    "2026-09-18",
    777,
    undefined,
    accounts.sam.token,
  );
});

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
});
after(async () => {
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

test("summary aggregates real data, limits recent results, and isolates reads and writes", async () => {
  for (const endpoint of [
    "/workouts",
    "/workouts/summary",
    "/workouts?date=2026-09-18",
  ]) {
    assert.equal((await request(endpoint)).status, 401);
    assert.equal((await request(endpoint, "invalid")).status, 401);
  }
  await save("Older workout", "2026-08-01", 100);
  const summary = await request(
    `/workouts/summary?timeZone=America%2FNew_York&userId=${accounts.sam.user.id}`,
    accounts.alex.token,
  );
  assert.equal(summary.status, 200);
  assert.equal(summary.data.today, "2026-09-19");
  assert.equal(summary.data.weekStart, "2026-09-14");
  assert.equal(summary.data.recent.length, 5);
  assert.equal(
    summary.data.daily.reduce((sum, day) => sum + day.count, 0),
    4,
  );
  assert.equal(
    summary.data.daily.reduce((sum, day) => sum + day.minutes, 0),
    127,
  );
  assert(
    summary.data.recent.every(
      (workout) => workout.userId === accounts.alex.user.id,
    ),
  );
  const day = await request(
    `/workouts?date=2026-09-18&userId=${accounts.sam.user.id}`,
    accounts.alex.token,
  );
  assert.deepEqual(
    day.data.workouts.map((workout) => workout.name),
    ["Full body session"],
  );
  const spoof = await request("/workouts", accounts.alex.token, {
    name: "Ownership check",
    durationMinutes: 20,
    date: "2026-08-01",
    userId: accounts.sam.user.id,
  });
  assert.equal(spoof.data.workout.userId, accounts.alex.user.id);
  const empty = await request("/workouts/summary", accounts.empty.token);
  assert.deepEqual(empty.data.daily, []);
  assert.deepEqual(empty.data.recent, []);
  assert.equal(
    (await request("/workouts/summary?timeZone=invalid", accounts.alex.token))
      .status,
    400,
  );
  assert.equal(
    (await request("/workouts?date=2026-02-30", accounts.alex.token)).status,
    400,
  );
  await Workout.create({
    userId: accounts.alex.user.id,
    name: "Legacy future",
    date: "2026-09-20",
    durationMinutes: 999,
  });
  const refreshed = await request("/workouts/summary", accounts.alex.token);
  assert.equal(
    refreshed.data.daily.reduce((sum, day) => sum + day.count, 0),
    4,
  );
  assert(
    !refreshed.data.recent.some((workout) => workout.name === "Legacy future"),
  );
});

test("removal requires authentication and deletes only the owner's exact record", async () => {
  const owned = await Workout.findOne({
    userId: accounts.alex.user.id,
    name: "Full body session",
  }).lean();
  const other = await Workout.findOne({ userId: accounts.sam.user.id }).lean();
  const remove = (id, token, body) =>
    fetch(`${api}/workouts/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal((await remove(owned._id)).status, 401);
  assert.equal((await remove("invalid", accounts.alex.token)).status, 400);
  const forbidden = await remove(other._id, accounts.alex.token, {
    userId: accounts.sam.user.id,
  });
  const missing = await remove(
    new mongoose.Types.ObjectId(),
    accounts.alex.token,
  );
  assert.equal(forbidden.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(await forbidden.json(), await missing.json());
  assert.ok(await Workout.exists({ _id: other._id }));
  const duplicate = await save(owned.name, "2026-09-18", 30);
  assert.equal((await remove(owned._id, accounts.alex.token)).status, 204);
  assert.equal(await Workout.exists({ _id: owned._id }), null);
  assert.ok(await Workout.exists({ _id: duplicate._id }));
  assert.equal((await remove(owned._id, accounts.alex.token)).status, 404);
  const summary = await request("/workouts/summary", accounts.alex.token);
  assert.equal(
    summary.data.daily.reduce((sum, day) => sum + day.count, 0),
    4,
  );
});

test("removal confirmation, retry, cross-tab updates, and selected-day empty state", async () => {
  await save("Mobility", "2026-09-19", 15);
  await save("Mobility", "2026-09-19", 30);
  const page = await openPage();
  await expectCount(page, 6);
  const sibling = await page.context().newPage();
  await sibling.clock.install({ time: now });
  await sibling.goto(base + "/workouts");
  await sibling
    .getByRole("heading", { name: "Mobility", exact: true })
    .first()
    .waitFor();
  await page.bringToFront();
  const trail = page.locator(".movement-trail");
  assert.equal(await trail.locator(".session-row").count(), 3);
  assert.equal(await trail.locator("img").count(), 3);
  await page.screenshot({
    path: path.join(artifacts, "recent-workouts-grouped.png"),
    fullPage: true,
  });
  const shortSession = trail
    .locator(".session-row")
    .filter({ has: page.getByText("15 min", { exact: true }) });
  const trigger = shortSession.getByRole("button", { name: "Remove Mobility" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Remove this session?" });
  await dialog.waitFor();
  assert.match(await dialog.textContent(), /15 min/);
  assert.equal(
    await dialog
      .getByRole("button", { name: "Keep session" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
  );
  await expectCount(page, 6);
  await trigger.click();
  await dialog.getByRole("button", { name: "Keep session" }).click();
  await trigger.click();
  await page.route("**/api/workouts/*", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill(response(500))
      : route.continue(),
  );
  await dialog
    .getByRole("button", { name: "Remove session", exact: true })
    .click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(await Workout.countDocuments({ name: "Mobility" }), 2);
  await page.unroute("**/api/workouts/*");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((item) => item.id),
      [],
    );
    assert.equal(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
  }
  await page.screenshot({
    path: path.join(artifacts, "remove-session-mobile.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Remove session", exact: true })
    .click();
  await expectCount(page, 5);
  assert.equal(
    await page
      .locator("#recent-title")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  assert.match(await page.locator(".metric-value").textContent(), /157/);
  await sibling.bringToFront();
  await sibling.waitForFunction(
    () =>
      [...document.querySelectorAll(".session-row")].filter(
        (row) => row.querySelector("h4")?.textContent === "Mobility",
      ).length === 1,
  );
  await page.bringToFront();
  await page.getByRole("button", { name: /Saturday, September 19/ }).click();
  await page
    .getByRole("button", { name: "Remove Mobility", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Remove session", exact: true })
    .click();
  await page.getByText("Nothing logged for Sep 19.", { exact: true }).waitFor();
  await expectCount(page, 4);
  assert.match(await page.locator(".metric-value").textContent(), /127/);
  assert.equal(await page.locator(".active-value strong").textContent(), "4");
  await page.reload();
  await expectCount(page, 4);
  assert.equal(
    await page.getByRole("heading", { name: "Mobility", exact: true }).count(),
    0,
  );
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({
    path: path.join(artifacts, "recent-workouts-mobile.png"),
    fullPage: true,
  });
  await sibling.bringToFront();
  await sibling
    .getByRole("button", { name: "Remove Full body session", exact: true })
    .click();
  await sibling
    .getByRole("button", { name: "Remove session", exact: true })
    .click();
  await sibling.waitForFunction(
    () =>
      ![...document.querySelectorAll("h4")].some(
        (el) => el.textContent === "Full body session",
      ),
  );
  assert.equal(
    await Workout.exists({
      userId: accounts.alex.user.id,
      name: "Full body session",
    }),
    null,
  );
});

test("editing enforces ownership and updates fair weekly comparisons", async () => {
  const owned = await Workout.findOne({
    userId: accounts.alex.user.id,
    name: "Full body session",
  }).lean();
  const other = await Workout.findOne({ userId: accounts.sam.user.id }).lean();
  const draft = {
    name: "Updated session",
    date: "2026-09-11",
    durationMinutes: 50,
    notes: "",
    timeZone: "America/New_York",
    userId: accounts.sam.user.id,
  };
  const edit = (id, token, body = draft) =>
    fetch(`${api}/workouts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  assert.equal((await edit(owned._id)).status, 401);
  assert.equal((await edit("invalid", accounts.alex.token)).status, 400);
  assert.equal((await edit(other._id, accounts.alex.token)).status, 404);
  assert.equal(
    (await edit(new mongoose.Types.ObjectId(), accounts.alex.token)).status,
    404,
  );
  for (const body of [
    { ...draft, durationMinutes: -1 },
    { ...draft, durationMinutes: { toString: null, valueOf: null } },
    { ...draft, date: "2026-09-20" },
    { ...draft, name: " " },
  ])
    assert.equal(
      (await edit(owned._id, accounts.alex.token, body)).status,
      400,
    );
  assert.equal((await edit(owned._id, accounts.alex.token)).status, 200);
  const stored = await Workout.findById(owned._id).lean();
  assert.equal(String(stored.userId), accounts.alex.user.id);
  assert.equal(stored.createdAt.toISOString(), owned.createdAt.toISOString());
  assert.equal(stored.notes, undefined);
  const summary = (
    await request(
      "/workouts/summary?timeZone=America%2FNew_York",
      accounts.alex.token,
    )
  ).data;
  assert.equal(
    summary.daily.reduce((total, day) => total + day.count, 0),
    3,
  );
  assert.equal(summary.previousWeek.through, "2026-09-12");
  assert.equal(
    summary.previousWeek.daily.reduce((total, day) => total + day.minutes, 0),
    50,
  );
  await save("Too old", "2026-08-01", 999);
  await Workout.create({
    userId: accounts.alex.user.id,
    name: "Future",
    date: "2026-09-20",
    durationMinutes: 999,
  });
  assert.equal((await request("/workouts/analytics")).status, 401);
  assert.equal(
    (await request("/workouts/analytics?timeZone=invalid", accounts.alex.token))
      .status,
    400,
  );
  const stats = (
    await request(
      `/workouts/analytics?userId=${accounts.sam.user.id}`,
      accounts.alex.token,
    )
  ).data;
  assert.equal(stats.windowStart, "2026-08-24");
  assert.equal(
    stats.daily.reduce((total, day) => total + day.count, 0),
    5,
  );
  assert.equal(
    stats.daily.reduce((total, day) => total + day.minutes, 0),
    147,
  );
  assert.equal(
    stats.daily.some(
      (day) => day.date > stats.today || day.date < stats.windowStart,
    ),
    false,
  );
  assert.deepEqual(
    (await request("/workouts/analytics", accounts.empty.token)).data.daily,
    [],
  );
});

test("large histories support inline edits, inline removal, and a bounded recent preview", async () => {
  await Workout.insertMany(
    Array.from({ length: 24 }, (_, index) => ({
      userId: accounts.alex.user.id,
      name: `Session ${index + 1}`,
      date: "2026-09-19",
      durationMinutes: index + 1,
      notes: "Original note",
      createdAt: new Date(Date.UTC(2026, 8, 19, 12, 0, index)),
    })),
  );
  const page = await openPage("/workouts");
  const history = page.locator(".workout-history");
  await history
    .getByRole("heading", { name: "Session 24", exact: true })
    .waitFor();
  assert.equal(await history.locator(".session-row").count(), 10);
  await page.getByRole("button", { name: "Show more sessions" }).click();
  assert.equal(await history.locator(".session-row").count(), 20);
  await page.getByRole("button", { name: "Show more sessions" }).click();
  assert.equal(await history.locator(".session-row").count(), 29);
  await page
    .getByRole("searchbox", { name: "Search sessions" })
    .fill("Session 24");
  await page
    .getByRole("button", { name: "Edit Session 24", exact: true })
    .click();
  const editor = page.getByRole("group", {
    name: "Edit Session 24",
    exact: true,
  });
  await editor.getByLabel("Workout name").fill("Evening reset");
  await editor.getByLabel("Date", { exact: true }).fill("2026-09-11");
  await editor.getByLabel("Minutes", { exact: true }).fill("12.5");
  await editor.getByLabel("Notes (optional)").fill("");
  await page.route("**/api/workouts/*", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill(response(500))
      : route.continue(),
  );
  await editor.getByRole("button", { name: "Save changes" }).click();
  await editor.getByRole("alert").waitFor();
  assert.equal(
    await editor.getByLabel("Workout name").inputValue(),
    "Evening reset",
  );
  await page.unroute("**/api/workouts/*");
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({
    path: path.join(artifacts, "inline-edit-mobile.png"),
    fullPage: true,
  });
  await editor.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("heading", { name: "No sessions match" }).waitFor();
  const stored = await Workout.findOne({ name: "Evening reset" }).lean();
  assert.equal(stored.date.toISOString().slice(0, 10), "2026-09-11");
  assert.equal(stored.durationMinutes, 12.5);
  assert.equal(stored.notes, undefined);
  await page.reload();
  await history
    .getByRole("heading", { name: "Session 23", exact: true })
    .waitFor();
  await page
    .getByRole("searchbox", { name: "Search sessions" })
    .fill("Evening reset");
  await page
    .getByRole("button", { name: "Remove Evening reset", exact: true })
    .click();
  const confirmation = page.getByRole("group", {
    name: "Remove Evening reset",
    exact: true,
  });
  await confirmation.waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await history.locator(".session-row.has-action").count(), 1);
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Remove Evening reset",
  );
  await page
    .getByRole("button", { name: "Remove Evening reset", exact: true })
    .click();
  await confirmation.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
      [],
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  await page.screenshot({
    path: path.join(artifacts, "inline-remove-mobile.png"),
    fullPage: true,
  });
  await confirmation
    .getByRole("button", { name: "Remove session", exact: true })
    .click();
  await page.getByRole("heading", { name: "No sessions match" }).waitFor();
  await page.getByRole("link", { name: "View progress" }).click();
  await expectCount(page, 27);
  assert.equal(await page.locator(".movement-trail .session-row").count(), 3);
  assert.match(await page.locator(".metric-value").textContent(), /403/);
});

test("Deep Insight loads on demand, compares matching weekdays, and offers an accessible timeline", async () => {
  await save("Previous Monday", "2026-09-07", 40);
  await save("Previous Tuesday", "2026-09-08", 25);
  let analyticsRequests = 0;
  const page = await openPage("/dashboard", async (page) =>
    page.on("request", (request) => {
      if (request.url().includes("/workouts/analytics")) analyticsRequests += 1;
    }),
  );
  await expectCount(page, 4);
  assert.equal(analyticsRequests, 0);
  assert.match(
    await page.locator(".weekly-comparison").textContent(),
    /2 workouts more/,
  );
  const insightButton = page.getByRole("button", {
    name: "Deep Insight",
    exact: true,
  });
  await insightButton.hover();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".insight-button"))
        .backgroundColor === "rgb(89, 56, 73)",
  );
  await insightButton.click();
  await page.locator(".analytics-comparison").waitFor();
  assert.ok(analyticsRequests >= 1);
  await page.locator(".movement-trail").waitFor({ state: "detached" });
  assert.match(
    await page.locator(".analytics-comparison strong").nth(0).textContent(),
    /4/,
  );
  assert.match(
    await page.locator(".analytics-comparison strong").nth(1).textContent(),
    /2/,
  );
  await page.getByRole("button", { name: "Minutes", exact: true }).click();
  assert.match(
    await page.locator(".analytics-comparison strong").nth(0).textContent(),
    /127/,
  );
  assert.match(
    await page.locator(".analytics-comparison strong").nth(1).textContent(),
    /65/,
  );
  await page.locator(".paired-bars button").first().click();
  assert.match(
    await page.locator(".analytics-reading").textContent(),
    /30 min.*40 min/,
  );
  assert.equal(
    await page.locator(".paired-bars button").last().isDisabled(),
    true,
  );
  await page.screenshot({
    path: path.join(artifacts, "deep-insight-week.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "4-week timeline", exact: true })
    .click();
  assert.equal(await page.locator(".timeline-dot.is-missing").count(), 1);
  const point = page.getByRole("button", {
    name: "Monday, September 7, 2026: 40 minutes",
    exact: true,
  });
  await point.focus();
  await page.keyboard.press("Enter");
  assert.match(
    await page.locator(".analytics-reading").textContent(),
    /September 7.*40 min/,
  );
  await page.getByText("View data table", { exact: true }).click();
  assert.equal(await page.locator(".analytics-table tbody tr").count(), 27);
  assert.match(
    await page.locator(".analytics-note").textContent(),
    /no duration/,
  );
  await page.getByText("View data table", { exact: true }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
      [],
    );
    if (width !== 320)
      await page.screenshot({
        path: path.join(artifacts, `deep-insight-timeline-${width}.png`),
        fullPage: true,
      });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".workout-analytics")
      .evaluate((element) => getComputedStyle(element).animationName),
    "none",
  );
  await page
    .getByRole("button", { name: "Back to sessions", exact: true })
    .click();
  assert.equal(await page.locator(".movement-trail .session-row").count(), 3);
});

test("inline confirmation and Deep Insight transitions survive quick reversals and reduced motion", async () => {
  const page = await openPage("/workouts");
  const remove = page.getByRole("button", {
    name: "Remove Full body session",
    exact: true,
  });
  await remove.click();
  const confirmation = page.getByRole("group", {
    name: "Remove Full body session",
    exact: true,
  });
  await confirmation.waitFor();
  await page.keyboard.press("Escape");
  await remove.waitFor();
  assert.equal(
    await remove.evaluate((element) => document.activeElement === element),
    true,
  );
  assert.equal(await page.locator(".session-row.has-action").count(), 0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await remove.click();
  assert.equal(
    await confirmation.evaluate((element) => element.getAnimations().length),
    0,
  );
  await confirmation.getByRole("button", { name: "Keep session" }).click();
  await remove.waitFor();
  await page.getByRole("link", { name: "View progress" }).click();
  await expectCount(page, 4);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const toggle = page.locator(".insight-button");
  await toggle.click();
  await toggle.click();
  await toggle.click();
  await page.locator(".analytics-comparison").waitFor();
  await page.locator(".movement-trail").waitFor({ state: "detached" });
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await toggle.click();
  await page.locator(".workout-analytics").waitFor({ state: "detached" });
  assert.equal(await page.locator(".movement-trail .session-row").count(), 3);
  assert.equal(
    await toggle.evaluate((element) => document.activeElement === element),
    true,
  );
  assert.equal(await page.locator(".insight-view.is-active").count(), 1);
});

test("API rejects malformed inputs and honors timezone boundaries", async () => {
  const baseWorkout = {
    name: "Walk",
    durationMinutes: 30,
    date: "2026-09-19",
    timeZone: "America/New_York",
  };
  for (const [field, value] of [
    ["name", "  "],
    ["name", {}],
    ["date", "2026-02-30"],
    ["date", "2026-09-20"],
    ["durationMinutes", -1],
    ["durationMinutes", undefined],
    ["durationMinutes", null],
    ["durationMinutes", ""],
    ["durationMinutes", true],
    ["durationMinutes", "Infinity"],
    ["durationMinutes", { toString: null, valueOf: null }],
    ["durationMinutes", [{ toString: null }]],
    ["notes", []],
  ]) {
    const result = await request("/workouts", accounts.alex.token, {
      ...baseWorkout,
      [field]: value,
    });
    assert.equal(result.status, 400);
    assert(result.data.errors[field]);
  }
  const allowed = await request("/workouts", accounts.alex.token, {
    ...baseWorkout,
    date: "2026-09-20",
    timeZone: "Pacific/Kiritimati",
    durationMinutes: 0,
  });
  assert.equal(allowed.status, 201);
  const tomorrowZone = await request(
    "/workouts/summary?timeZone=Pacific%2FKiritimati",
    accounts.alex.token,
  );
  assert.equal(tomorrowZone.data.today, "2026-09-20");
  assert.equal(tomorrowZone.data.daily.at(-1).durationsRecorded, 1);
});

test("dashboard supports responsive layouts, day selection, keyboard notes, and proportional bars", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  assert.match(await page.locator(".metric-value").textContent(), /127/);
  assert.equal(await page.locator(".session-row").count(), 3);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(artifacts, "dashboard-desktop.png"),
    fullPage: true,
  });
  for (const width of [1440, 390, 320, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    );
    if ([1440, 390].includes(width)) {
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        audit.violations.map((item) => ({
          id: item.id,
          targets: item.nodes.map((node) => node.target),
        })),
        [],
      );
    }
    if (width === 390)
      await page.screenshot({
        path: path.join(artifacts, "dashboard-mobile.png"),
        fullPage: true,
      });
  }
  await page.locator("summary").first().focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("details").first().getAttribute("open"), "");
  assert.match(
    await page.locator("details[open] p").textContent(),
    /One session at a time/,
  );
  await page.getByRole("button", { name: /Monday, September 14/ }).click();
  await page.getByRole("heading", { name: "Morning strength" }).waitFor();
  assert.equal(await page.locator(".session-row").count(), 1);
  assert.equal(
    await page
      .getByRole("button", { name: /Monday, September 14/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: /Thursday, September 17/ }).click();
  await page.getByText("Nothing logged for Sep 17.").waitFor();
  await page.getByRole("button", { name: "Show recent" }).click();
  await page.getByRole("heading", { name: "Full body session" }).waitFor();
  for (let index = 0; index < 10; index++)
    await save(`Extra session ${index}`, "2026-09-14", 1);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expectCount(page, 14);
  const fills = await page
    .locator(".day-fill")
    .evaluateAll(async (elements) => {
      await Promise.all(
        elements.flatMap((element) =>
          element.getAnimations().map((animation) => animation.finished),
        ),
      );
      return elements.map((element) =>
        parseFloat(getComputedStyle(element).height),
      );
    });
  assert(Math.abs(fills[0] / fills[1] - 11) < 0.1);
});

test("logging has labels, validation, feedback, and survives an older in-flight list", async () => {
  const gate = deferred();
  const started = deferred();
  let reads = 0;
  let holdResponses = true;
  const page = await openPage("/workouts", async (page) => {
    await page.route(listPattern, async (route) => {
      reads++;
      const result = await route.fetch().catch(() => null);
      if (!result) return; // React StrictMode may cancel its first request.
      if (holdResponses) {
        started.resolve();
        await gate.promise;
      }
      await route.fulfill({ response: result }).catch(() => {});
    });
  });
  await started.promise;
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Workout name").fill("   ");
  await page.getByRole("button", { name: "Save workout" }).click();
  await page
    .getByText("Choose an activity or enter a workout name.", { exact: true })
    .waitFor();
  await page.getByLabel("Workout name").fill("Freshly saved workout");
  await page.locator(".workout-date summary").click();
  await page.getByLabel("Date", { exact: true }).fill("2026-09-20");
  assert(
    await page
      .getByLabel("Date", { exact: true })
      .evaluate((input) => input.validity.rangeOverflow),
  );
  await page.getByLabel("Date", { exact: true }).fill("2026-09-19");
  await page.getByLabel("Minutes", { exact: false }).fill("18.5");
  await page.locator(".workout-note summary").click();
  await page.getByLabel("Notes", { exact: false }).fill("Steady pace");
  await page.getByRole("button", { name: "Save workout" }).click();
  await page
    .getByText("Freshly saved workout saved.", { exact: true })
    .waitFor();
  holdResponses = false;
  gate.resolve();
  await page.getByRole("heading", { name: "Freshly saved workout" }).waitFor();
  assert(
    reads >= 2,
    "The saved workout requires a fresh read after the held snapshot",
  );
  assert(
    await page
      .getByRole("button", { name: "Walk", exact: true })
      .evaluate((button) => button === document.activeElement),
  );
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    audit.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
    [],
  );
  await page.screenshot({
    path: path.join(artifacts, "workouts-desktop.png"),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (width === 390)
      await page.screenshot({
        path: path.join(artifacts, "workouts-mobile.png"),
        fullPage: true,
      });
  }
  await page.getByRole("link", { name: "View progress" }).click();
  await expectCount(page, 5);
  assert.match(await page.locator(".metric-value").textContent(), /145.5/);
});

test("stalled saves time out, preserve the draft, and allow a deliberate retry", async () => {
  const page = await openPage("/workouts");
  const started = deferred();
  const gate = deferred();
  let writes = 0;
  await page.route("**/api/workouts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    writes += 1;
    started.resolve();
    await gate.promise;
    await route.abort().catch(() => {});
  });
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Workout name").fill("Timeout recovery walk");
  await page.getByLabel("Minutes", { exact: false }).fill("18.5");
  await page.locator(".workout-note summary").click();
  await page.getByLabel("Notes", { exact: false }).fill("Keep this draft");
  await page.getByRole("button", { name: "Save workout" }).click();
  await started.promise;
  assert.equal(
    await page.getByRole("button", { name: "Saving…" }).isDisabled(),
    true,
  );
  await page.clock.fastForward(20_001);
  await page
    .getByRole("alert")
    .filter({ hasText: "Saving took too long" })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Save workout" }).isEnabled(),
    true,
  );
  assert.equal(
    await page.getByLabel("Workout name").inputValue(),
    "Timeout recovery walk",
  );
  assert.equal(
    await page.getByLabel("Minutes", { exact: false }).inputValue(),
    "18.5",
  );
  assert.equal(
    await page.getByLabel("Notes", { exact: false }).inputValue(),
    "Keep this draft",
  );
  assert.equal(writes, 1, "A timeout must not automatically retry a write");
  assert.equal(
    await Workout.countDocuments({ name: "Timeout recovery walk" }),
    0,
  );
  gate.resolve();
  await page.unroute("**/api/workouts");
  await page.getByRole("button", { name: "Save workout" }).click();
  await page
    .getByText("Timeout recovery walk saved.", { exact: true })
    .waitFor();
  await page.getByRole("heading", { name: "Timeout recovery walk" }).waitFor();
  assert.equal(
    await Workout.countDocuments({ name: "Timeout recovery walk" }),
    1,
  );
});

test("overlapping refresh events share a request and polling finds new saves", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  const gate = deferred();
  const started = deferred();
  let reads = 0;
  await page.route(summaryPattern, async (route) => {
    reads++;
    const result = await route.fetch();
    started.resolve();
    await gate.promise;
    await route.fulfill({ response: result });
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await started.promise;
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  gate.resolve();
  await page.getByRole("button", { name: "Refresh", exact: true }).waitFor();
  assert.equal(reads, 1);
  await page.unroute(summaryPattern);
  await save("Saved from another device", "2026-09-19", 10);
  await page.clock.fastForward(60_000);
  await expectCount(page, 5);
  await page
    .getByRole("heading", { name: "Saved from another device" })
    .waitFor();
});

test("refresh failures recover and expired logout never waits for the network", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  await page.route(summaryPattern, (route) => route.fulfill(response(500)));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.match(await page.getByRole("alert").textContent(), /last loaded/);
  await expectCount(page, 4);
  await page.unroute(summaryPattern);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("alert").waitFor({ state: "hidden" });
  await page.route(summaryPattern, (route) => route.fulfill(response(401)));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator(".weekly-widget").count(), 0);
  const gate = deferred();
  await page.route("**/api/auth/logout", async (route) => {
    await gate.promise;
    await route.fulfill(response(200));
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/login");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("fwt_token")),
    null,
  );
  await page.unroute(summaryPattern);
  await page.getByLabel("Email").fill("sam@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("heading", { name: "Private Sam workout" }).waitFor();
  gate.resolve();
  await expectCount(page, 1);
});

test("cross-tab switches discard old responses and logout removes private content", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  const gate = deferred();
  const started = deferred();
  let first = true;
  await page.route(summaryPattern, async (route) => {
    const result = await route.fetch();
    if (first) {
      first = false;
      started.resolve();
      await gate.promise;
    }
    await route.fulfill({ response: result }).catch(() => {});
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await started.promise;
  const tab = await page.context().newPage();
  await tab.goto(base + "/profile");
  await tab.evaluate(
    (token) => localStorage.setItem("fwt_token", token),
    accounts.sam.token,
  );
  await page.getByRole("heading", { name: "Private Sam workout" }).waitFor();
  gate.resolve();
  await expectCount(page, 1);
  assert.equal(
    await page.getByRole("heading", { name: "Full body session" }).count(),
    0,
  );
  await tab.evaluate(
    (token) => localStorage.setItem("fwt_token", token),
    accounts.empty.token,
  );
  await page
    .getByRole("heading", { name: "Your first workout belongs here." })
    .waitFor();
  await expectCount(page, 0);
  await tab.evaluate(() => localStorage.removeItem("fwt_token"));
  await page.waitForURL("**/login");
  assert.equal(await page.locator(".session-row").count(), 0);
});

test("initial failures and timed-out refreshes recover without showing invented totals", async () => {
  const page = await openPage("/dashboard", (page) =>
    page.route(summaryPattern, (route) => route.fulfill(response(500))),
  );
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator(".weekly-widget").count(), 0);
  await page.unroute(summaryPattern);
  await page.getByRole("button", { name: "Try again" }).click();
  await expectCount(page, 4);
  const gate = deferred();
  const started = deferred();
  await page.route(summaryPattern, async (route) => {
    const result = await route.fetch();
    started.resolve();
    await gate.promise;
    await route.fulfill({ response: result }).catch(() => {});
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await started.promise;
  await page.clock.fastForward(20_001);
  await page.getByRole("alert").waitFor();
  await expectCount(page, 4);
  gate.resolve();
  await page.unroute(summaryPattern);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("alert").waitFor({ state: "hidden" });
});

test("Dayform polish preserves date context, strengthens selection, and respects reduced motion", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  await page.getByRole("link", { name: "Dayform home" }).waitFor();
  await page.setViewportSize({ width: 1900, height: 1100 });
  const gutter = await page.evaluate(
    () =>
      document.querySelector(".progress-dashboard").getBoundingClientRect()
        .left -
      document.querySelector(".app-sidebar").getBoundingClientRect().right,
  );
  assert(gutter >= 24 && gutter <= 56, `Dashboard gutter: ${gutter}`);
  assert.equal(
    await page
      .locator(".day-fill")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
    "0.3s",
  );
  assert.equal(
    await page
      .locator(".app-nav-link")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
    "0.18s, 0.18s",
  );
  await page.getByRole("button", { name: /Thursday, September 17/ }).click();
  await page.getByText("Nothing logged for Sep 17.").waitFor();
  const outline = await page
    .locator('.day-button[aria-pressed="true"] .day-track')
    .evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
      return getComputedStyle(element).outlineWidth;
    });
  assert.equal(outline, "4px");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: path.join(artifacts, "dayform-selected-day.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Log a workout for this day" }).click();
  assert.equal(
    await page.getByLabel("Date", { exact: true }).inputValue(),
    "2026-09-17",
  );
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("Workout name").fill("Thursday recovery");
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: "Save workout" }).click();
  await page.getByText("Thursday recovery saved.", { exact: true }).waitFor();
  await page.locator(".session-saved-reveal").waitFor({ state: "attached" });
  assert.equal(
    await page
      .locator(".session-saved-reveal")
      .evaluate((el) => getComputedStyle(el).animationName),
    "saved-row-reveal",
  );
  assert.equal(
    await page.getByLabel("Date", { exact: true }).inputValue(),
    "2026-09-17",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".session-saved-reveal").isVisible(), false);
  await page.getByRole("link", { name: "View progress" }).click();
  await expectCount(page, 5);
  assert.equal(
    await page
      .locator(".day-fill")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
    "0s",
  );
  assert.equal(
    await page
      .locator(".session-list")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
    "none",
  );
  await page.getByRole("button", { name: /Monday, September 14/ }).click();
  await page.getByRole("heading", { name: "Morning strength" }).waitFor();
  assert.equal(
    await page
      .locator('.day-button[aria-pressed="true"] .day-track')
      .evaluate((element) => getComputedStyle(element).outlineWidth),
    "4px",
  );
});

test("branded authentication is accessible and signup preserves the requested workout date", async () => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/New_York",
    locale: "en-US",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  await page.clock.install({ time: now });
  await page.goto(base + "/workouts?date=2026-09-17");
  await page.waitForURL("**/login");
  await page.getByRole("link", { name: "Dayform home" }).waitFor();
  assert.equal(await page.title(), "Dayform");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(artifacts, "dayform-login.png"),
    fullPage: true,
  });
  let audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    audit.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
    [],
  );
  await page.getByLabel("Email").fill("alex@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Wrong-password-9!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("alert").waitFor();
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await page.getByRole("heading", { name: "Create your account" }).waitFor();
  await page.screenshot({
    path: path.join(artifacts, "dayform-signup.png"),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    audit.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
    [],
  );
  await page.getByLabel("Email").fill("new-dayform@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill("Different-password-9!");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByText("Passwords do not match.", { exact: true }).waitFor();
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL("**/workouts?date=2026-09-17");
  assert.equal(
    await page.getByLabel("Date", { exact: true }).inputValue(),
    "2026-09-17",
  );
  for (const invalid of ["2026-02-30", "2026-09-20"]) {
    await page.goto(base + `/workouts?date=${invalid}`);
    await page.locator(".workout-date summary").waitFor();
    assert.equal(
      await page.getByLabel("Date", { exact: true }).inputValue(),
      "2026-09-19",
    );
  }
});

test("history filters and one inline encouragement per successful save", async () => {
  const page = await openPage("/workouts");
  await page
    .getByRole("heading", { name: "Sunday recovery", exact: true })
    .waitFor();
  const history = page.locator(".workout-history");
  const search = page.getByRole("searchbox", { name: "Search sessions" });
  assert.equal(await history.locator(".session-row").count(), 5);
  assert.match(
    await history.locator(".history-overview").textContent(),
    /127 min recorded/,
  );
  await search.fill("evening");
  assert.equal(await history.locator(".session-row").count(), 1);
  assert.match(
    await history.locator(".session-row").textContent(),
    /Evening walk/,
  );
  await search.fill("reset");
  assert.match(
    await history.locator(".session-row").textContent(),
    /Yoga & mobility/,
  );
  await search.fill("no such workout");
  await page.getByRole("heading", { name: "No sessions match" }).waitFor();
  await page.getByRole("button", { name: "Show all sessions" }).click();
  await page.getByRole("button", { name: "This week", exact: true }).click();
  assert.equal(await history.locator(".session-row").count(), 4);
  await page.screenshot({
    path: path.join(artifacts, "sessions-redesign-desktop.png"),
    fullPage: true,
  });

  await search.fill("evening");
  for (const [index, message] of [
    "You did it!",
    "Great work!",
    "One more in the books!",
    "Keep showing up!",
    "You did it!",
  ].entries()) {
    await page.getByRole("button", { name: "Walk", exact: true }).click();
    await page.getByRole("button", { name: "15 min", exact: true }).click();
    await page
      .getByRole("button", { name: "Save workout", exact: true })
      .click();
    const reveal = page.locator(".session-saved-reveal");
    await reveal.waitFor({ state: "attached" });
    assert.equal(await reveal.count(), 1);
    assert.equal(await reveal.textContent(), message);
    assert.equal(
      await reveal.locator("xpath=..").locator("h4").textContent(),
      "Walk",
    );
    assert.equal(await page.locator(".workout-saved-notice").count(), 0);
    assert.equal(await search.inputValue(), "");
    assert.equal(await history.locator(".session-row").count(), 6 + index);
    await page.clock.runFor(450);
    assert.equal(await reveal.textContent(), message);
    if (index === 0)
      await page.screenshot({
        path: path.join(artifacts, "inline-save-confirmation.png"),
        fullPage: true,
      });
    await page.clock.fastForward(1600);
    assert.equal(await reveal.count(), 0);
  }
  await page.getByRole("button", { name: "Refresh workouts" }).click();
  assert.equal(await page.locator(".session-saved-reveal").count(), 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.locator(".session-saved-reveal").waitFor({ state: "attached" });
  assert.equal(await page.locator(".session-saved-reveal").isVisible(), false);
  await page.clock.fastForward(1600);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    await history.scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
      [],
    );
    if (width === 390)
      await page.screenshot({
        path: path.join(artifacts, "sessions-redesign-mobile.png"),
        fullPage: true,
      });
  }
  await page.reload();
  await page
    .getByRole("heading", { name: "Full body session", exact: true })
    .waitFor();
  assert.equal(await page.locator(".session-saved-reveal").count(), 0);
});

test("quick logging, repeat review, reload persistence, and private history", async () => {
  const page = await openPage("/workouts");
  await page
    .getByRole("heading", { name: "Full body session", exact: true })
    .waitFor();
  assert.equal(await page.locator(".activity-choice").count(), 6);
  assert.equal(await page.getByLabel("Workout name").count(), 0);
  assert.equal(
    await page.getByLabel("Notes", { exact: true }).isVisible(),
    false,
  );
  assert.equal(
    await page.getByText("Private Sam workout", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.getByText("Choose a duration or enter your minutes.").waitFor();
  await page.getByRole("button", { name: "30 min", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.getByRole("heading", { name: "Walk", exact: true }).waitFor();
  const stored = await Workout.findOne({
    userId: accounts.alex.user.id,
    name: "Walk",
  }).lean();
  assert.equal(stored.durationMinutes, 30);
  assert.equal(stored.date.toISOString().slice(0, 10), "2026-09-19");
  await page.locator(".session-saved-reveal").waitFor({ state: "attached" });
  await page.reload();
  await page.getByRole("heading", { name: "Walk", exact: true }).waitFor();
  assert.equal(await page.locator(".workout-saved-notice").count(), 0);
  await page
    .getByRole("button", { name: "Log Walk again", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Minutes", { exact: true }).inputValue(),
    "30",
  );
  assert.equal(
    await Workout.countDocuments({
      userId: accounts.alex.user.id,
      name: "Walk",
    }),
    1,
    "Repeating only prefills; saving must be explicit",
  );
  await page.locator(".workout-date summary").click();
  await page.getByRole("button", { name: "Yesterday", exact: true }).click();
  await page.getByRole("button", { name: "Rename Walk", exact: true }).click();
  await page.getByLabel("Workout name").fill("Lakeside walk");
  await page.getByLabel("Minutes", { exact: true }).fill("22.5");
  await page.locator(".workout-note summary").click();
  await page.getByLabel("Notes", { exact: true }).fill("Sunny loop");
  await page.route("**/api/workouts", (route) =>
    route.request().method() === "POST"
      ? route.fulfill(response(500))
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByLabel("Workout name").inputValue(),
    "Lakeside walk",
  );
  assert.equal(await page.locator(".workout-saved-notice").count(), 0);
  await page.unroute("**/api/workouts");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("heading", { name: "Lakeside walk", exact: true })
    .waitFor();
  const repeated = await Workout.findOne({ name: "Lakeside walk" }).lean();
  assert.equal(repeated.durationMinutes, 22.5);
  assert.equal(repeated.date.toISOString().slice(0, 10), "2026-09-18");
  assert.equal(repeated.notes, "Sunny loop");
  await page
    .getByRole("button", { name: "Log Sunday recovery again", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Minutes", { exact: true }).inputValue(),
    "",
  );
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.getByText("Choose a duration or enter your minutes.").waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".activity-choice")
      .first()
      .evaluate((node) => getComputedStyle(node).transitionDuration),
    "0s",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
      [],
    );
  }
  const tab = await page.context().newPage();
  await tab.goto(base + "/profile");
  await tab.evaluate(
    (token) => localStorage.setItem("fwt_token", token),
    accounts.sam.token,
  );
  await page
    .getByRole("heading", { name: "Private Sam workout", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Log Walk again", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Workout name").count(),
    0,
    "Switching accounts clears the draft",
  );
  await tab.evaluate(
    (token) => localStorage.setItem("fwt_token", token),
    accounts.empty.token,
  );
  await page
    .getByRole("heading", { name: "Your first session starts here" })
    .waitFor();
  await page.screenshot({
    path: path.join(artifacts, "workouts-empty-mobile.png"),
    fullPage: true,
  });
});

test("landscape loads locally and mascot motion follows new activity and reduced-motion preferences", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  const photo = page.locator(".dashboard-landscape");
  await photo.evaluate((image) => image.decode());
  assert(
    await photo.evaluate(
      (image) =>
        image.naturalWidth > 0 &&
        new URL(image.currentSrc).origin === location.origin,
    ),
  );
  const mascot = page.locator(".mascot-body");
  assert.equal(
    await mascot.evaluate((node) => node.getAnimations().length),
    0,
    "No entrance animation on load",
  );
  await save("An afternoon outside", "2026-09-19", 20);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expectCount(page, 5);
  assert.equal(await mascot.evaluate((node) => node.getAnimations().length), 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => document.querySelector(".mascot-body").getAnimations().length === 0,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const refreshed = page.waitForResponse(summaryPattern);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await refreshed;
  assert.equal(
    await mascot.evaluate((node) => node.getAnimations().length),
    0,
    "Unchanged refresh does not replay the stretch",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await save("Evening mobility", "2026-09-19", 10);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expectCount(page, 6);
  assert.equal(await mascot.evaluate((node) => node.getAnimations().length), 0);
  await page.route("**/src/assets/photos/*", (route) =>
    route.request().resourceType() === "image"
      ? route.abort()
      : route.continue(),
  );
  await page.reload();
  await expectCount(page, 6);
  await page
    .getByRole("heading", { name: "Your progress", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Log workout", exact: true }).waitFor();
});

test("illustrated recent sessions, first-walk invitation, and account controls preserve accessible navigation", async () => {
  const page = await openPage();
  await expectCount(page, 4);
  const account = page.locator(".app-account");
  const chart = await page
    .locator(".movement-trail .session-row")
    .evaluateAll((rows) =>
      rows.map((row) => ({
        height: row.querySelector(".trail-bar").getBoundingClientRect().height,
        minutes: Number.parseFloat(
          row.querySelector(".session-duration").textContent,
        ),
      })),
    );
  assert.equal(chart.length, 3);
  for (const bar of chart)
    assert.ok(
      Math.abs(bar.height / bar.minutes - 42 / 42) < 0.01,
      "Duration bars must preserve their proportions",
    );
  assert.equal(
    await account.locator(".account-email").textContent(),
    "alex@example.test",
  );
  assert.equal(await account.locator("img").count(), 0);
  assert.equal(
    (await account.locator(".account-avatar").textContent()).trim(),
    "AM",
  );
  assert.equal(await page.locator(".active-widget .metric-icon").count(), 0);
  assert.match(
    await page.locator(".active-value").textContent(),
    /4.*of 7 days/,
  );
  const custom = page.locator(".movement-trail .session-row").filter({
    has: page.getByRole("heading", {
      name: "Full body session",
      exact: true,
    }),
  });
  assert.equal(await custom.locator("img").count(), 1);
  assert.equal(await custom.locator("time").textContent(), "Yesterday");
  assert.match(
    await custom.locator(".note-preview").textContent(),
    /A little stronger/,
  );
  await custom.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await custom.locator("details").getAttribute("open"), "");
  assert.match(
    await custom.locator("details p").textContent(),
    /One session at a time/,
  );
  await page.keyboard.press("Enter");
  assert.equal(await custom.locator("details").getAttribute("open"), null);
  await save("Walk", "2026-09-19", 30, "The long way home");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expectCount(page, 5);
  const walk = page
    .locator(".movement-trail .session-row")
    .filter({ has: page.getByRole("heading", { name: "Walk", exact: true }) });
  assert.equal(await walk.locator("img").count(), 1);
  assert.equal(await walk.locator("time").textContent(), "Today");
  assert.equal(await walk.locator(".session-duration").textContent(), "30 min");
  assert.equal(
    await walk.evaluate((element) => getComputedStyle(element).animationName),
    "none",
  );
  await page.screenshot({
    path: path.join(artifacts, "journal-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 600 });
  await account
    .getByRole("link", { name: "View profile", exact: true })
    .click();
  await page.waitForURL("**/profile");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expectCount(page, 5);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await account.locator(".logout-label").isVisible(), false);
    assert.equal(
      await account
        .getByRole("button", { name: "Log out", exact: true })
        .isVisible(),
      true,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
      [],
    );
    if (width === 390)
      await page.screenshot({
        path: path.join(artifacts, "journal-mobile.png"),
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Email").fill("empty@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "Your first workout belongs here.",
      exact: true,
    })
    .waitFor();
  await expectCount(page, 0);
  assert.equal(
    await page
      .getByRole("link", { name: "Log a walk", exact: true })
      .locator("img")
      .count(),
    0,
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: path.join(artifacts, "journal-empty-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 1100 });
  await page.screenshot({
    path: path.join(artifacts, "journal-empty-mobile.png"),
    fullPage: true,
  });
  assert.match(
    await page.locator(".active-caption").textContent(),
    /room for movement/,
  );
  await page.getByRole("link", { name: "Log a walk", exact: true }).click();
  await page.waitForURL("**/workouts?activity=Walk");
  assert.equal(
    await page
      .getByRole("button", { name: "Walk", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.getByLabel("Minutes", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await Workout.countDocuments({ userId: accounts.empty.user.id }),
    0,
  );
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.getByText("Walk saved.", { exact: true }).waitFor();
  await page.getByRole("link", { name: "View progress", exact: true }).click();
  await expectCount(page, 1);
  await page.getByRole("heading", { name: "Walk", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Log a walk", exact: true }).count(),
    0,
  );
  await page.goto(base + "/workouts?activity=NotAnActivity");
  await page.locator(".activity-choice").first().waitFor();
  assert.equal(
    await page.locator('.activity-choice[aria-pressed="true"]').count(),
    0,
  );
});
