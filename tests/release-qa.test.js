import assert from "node:assert/strict";
import { after, before, test as nodeTest } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { MongoMemoryServer } from "mongodb-memory-server";

const test = (name, run) => nodeTest(name, { timeout: 180_000 }, run);
const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const artifacts = path.join(root, "tests/artifacts");
const password = "Release-qa-1188!";
const timeZone = "America/New_York";
// 320 px is the width WCAG 1.4.10 (Reflow) asks pages to fit without scrolling sideways.
const viewports = [
  ["desktop", { width: 1280, height: 800 }],
  ["phone", { width: 390, height: 844 }],
  ["small-phone", { width: 360, height: 740 }],
  ["narrow", { width: 320, height: 640 }],
];
const openDeepInsight = async (page) => {
  await page.getByRole("button", { name: "Deep Insight" }).click();
  await page.getByRole("button", { name: "4-week timeline", exact: true }).click();
  await page.locator(".activity-timeline").waitFor();
};
// Signed-out pages come first; the account signs in once before the rest.
const screens = [
  ["home", "/", false],
  ["login", "/login", false],
  ["signup", "/signup", false],
  ["dashboard", "/dashboard", true],
  ["dashboard-deep-insight", "/dashboard", true, openDeepInsight],
  ["workouts", "/workouts", true],
  ["nutrition", "/nutrition", true],
  ["goals", "/goals", true],
  ["profile", "/profile", true],
];
let database, mongoose, apiServer, vite, browser, api, base, token;

async function request(endpoint, body, method = "POST") {
  const response = await fetch(api + endpoint, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ timeZone, ...body }),
  });
  const data = await response.json();
  assert.ok(response.ok, `${method} ${endpoint}: ${JSON.stringify(data)}`);
  return data;
}

// Workouts, meals, goals, and a profile, so every page shows its filled-in layout.
async function seed() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone });
  const daysFrom = (days) => new Date(Date.parse(`${today}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  ({ token } = await request("/auth/signup", { email: "jordan@example.test", password, confirmPassword: password }));
  await request("/auth/me", {
    displayName: "Jordan Rivers",
    pronouns: "they/them",
    aboutMe: "Training for a spring 10K.",
    favoriteActivities: ["Run", "Mobility"],
  }, "PATCH");
  for (const [name, days, durationMinutes, notes] of [
    ["Morning run", 0, 35, "Easy pace along the river."],
    ["Strength training", -1, 50],
    ["Yoga", -3, 30, "Hips and shoulders."],
    ["Bike commute", -9, 25],
  ]) {
    await request("/workouts", { name, date: daysFrom(days), durationMinutes, ...(notes ? { notes } : {}) });
  }
  for (const [foodName, mealType, days, calories] of [
    ["Oatmeal with berries", "breakfast", 0, 350],
    ["Chicken salad", "lunch", 0, 520],
    ["Salmon and rice", "dinner", -1, 640],
  ]) {
    await request("/nutrition", { foodName, mealType, date: daysFrom(days), calories, protein: 25, carbohydrates: 40, fat: 12 });
  }
  await request("/goals", { title: "Work out 12 times", category: "workout", tracking: "workoutCount", startDate: daysFrom(-6), targetValue: 12, targetDate: daysFrom(21) });
  await request("/goals", { title: "Sleep 8 hours", category: "wellness", targetValue: 7, currentValue: 3, unit: "nights", targetDate: daysFrom(10) });
  const water = { title: "Drink water daily", category: "nutrition", targetValue: 14, currentValue: 14, unit: "days", targetDate: daysFrom(5) };
  const { goal } = await request("/goals", water);
  await request(`/goals/${goal._id}`, { ...water, status: "completed" }, "PUT");
}

function describeFocus() {
  const element = document.activeElement;
  if (!element || element === document.body) return null;
  element.dataset.qaStop ||= String(document.querySelectorAll("[data-qa-stop]").length);
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  const hit = document.elementFromPoint(
    Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1),
    Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1),
  );
  const x = Math.max(0, Math.floor(box.left) - 6);
  const y = Math.max(0, Math.floor(box.top) - 6);
  return {
    id: element.dataset.qaStop,
    name: (element.getAttribute("aria-label") || element.innerText || element.name || element.tagName).trim().replace(/\s+/g, " ").slice(0, 40),
    visible: box.width > 0 && box.height > 0 && element.checkVisibility({ visibilityProperty: true }),
    onScreen: box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth,
    covered: Boolean(hit && !element.contains(hit) && !hit.contains(element) && !hit.closest("label")?.contains(element)),
    outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
    clip: { x, y, width: Math.min(innerWidth, Math.ceil(box.right) + 6) - x, height: Math.min(innerHeight, Math.ceil(box.bottom) + 6) - y },
  };
}

// A control drawn without an outline, like a timeline bar, must still look different while focused.
async function changesWhenFocused(page, stop) {
  if (stop.clip.width <= 0 || stop.clip.height <= 0) return false;
  const focused = await page.screenshot({ clip: stop.clip, animations: "disabled" });
  await page.evaluate(() => document.activeElement.blur());
  const unfocused = await page.screenshot({ clip: stop.clip, animations: "disabled" });
  await page.evaluate((id) => document.querySelector(`[data-qa-stop="${id}"]`).focus(), stop.id);
  return !focused.equals(unfocused);
}

// blur() alone leaves Chrome's next Tab starting from the last control clicked or focused.
const focusTop = (page) =>
  page.evaluate(() => {
    const start = document.createElement("span");
    start.tabIndex = -1;
    document.body.prepend(start);
    start.focus();
    start.remove();
    window.scrollTo(0, 0);
  });

// Presses Tab from the top until focus leaves the page or comes back around.
async function walkWithTab(page) {
  await focusTop(page);
  const stops = [];
  for (let press = 0; press < 300; press++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(describeFocus);
    if (!stop) {
      if (stops.length) break;
      continue;
    }
    if (stops.at(-1)?.id === stop.id) continue; // A date field takes several Tabs.
    if (stops.some((seen) => seen.id === stop.id)) break;
    stop.indicator = stop.outline || (await changesWhenFocused(page, stop));
    stops.push(stop);
  }
  const unreached = await page.evaluate(() => {
    const reachedRadios = new Set([...document.querySelectorAll("input[type=radio][data-qa-stop]")].map((radio) => radio.name));
    return [...document.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return !element.dataset.qaStop && !element.disabled && element.tabIndex >= 0 && element.type !== "hidden" &&
          box.width > 0 && box.height > 0 && element.checkVisibility({ visibilityProperty: true }) &&
          !element.closest("[inert], [aria-hidden='true']") && !(element.type === "radio" && reachedRadios.has(element.name));
      })
      .map((element) => `${element.tagName.toLowerCase()} "${(element.getAttribute("aria-label") || element.innerText || element.name || "").trim().slice(0, 30)}"`);
  });
  return { stops, unreached };
}

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  delete process.env.GEMINI_API_KEY;
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  ({ default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js"));
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
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
  await seed();
}, { timeout: 120_000 });

after(async () => {
  await browser?.close();
  await vite?.close();
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

for (const [label, viewport] of viewports) {
  test(`Every page fits a ${viewport.width} px screen, passes axe, and works with the keyboard`, async () => {
    // Reduced motion keeps animations out of the screenshots and contrast checks.
    const context = await browser.newContext({ viewport, timezoneId: timeZone, locale: "en-US", reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(8_000);
      page.setDefaultNavigationTimeout(30_000);
      const problems = [];
      page.on("pageerror", (error) => problems.push(`${label}: page error ${error.message}`));
      for (const [name, route, signedIn, open] of screens) {
        const where = `${label} ${name}`;
        if (signedIn && !(await page.evaluate(() => localStorage.getItem("fwt_token")))) {
          await page.evaluate((value) => localStorage.setItem("fwt_token", value), token);
        }
        await page.goto(base + route);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        assert.equal(new URL(page.url()).pathname, route, `${where} opened ${page.url()}`);
        if (open) await open(page);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 0) problems.push(`${where}: scrolls sideways by ${overflow}px`);
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        for (const violation of violations) {
          problems.push(`${where}: axe ${violation.id} on ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
        }
        // A full-page screenshot draws fixed elements, like the hidden skip link, where the page is scrolled to.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(artifacts, `release-qa-${label}-${name}.png`), fullPage: true });

        const { stops, unreached } = await walkWithTab(page);
        for (const stop of stops) {
          if (!stop.visible) problems.push(`${where}: Tab lands on hidden "${stop.name}"`);
          else if (!stop.onScreen) problems.push(`${where}: "${stop.name}" is off screen when focused`);
          else if (stop.covered) problems.push(`${where}: "${stop.name}" is covered when focused`);
          else if (!stop.indicator) problems.push(`${where}: "${stop.name}" shows no focus indicator`);
        }
        for (const control of unreached) problems.push(`${where}: Tab never reaches ${control}`);
        if (signedIn && !open) {
          await focusTop(page);
          await page.keyboard.press("Tab");
          const first = await page.evaluate(() => document.activeElement.textContent.trim());
          await page.keyboard.press("Enter");
          const target = await page.evaluate(() => document.activeElement.id);
          if (first !== "Skip to content" || target !== "main-content") {
            problems.push(`${where}: first Tab stop "${first}" moved focus to "${target}"`);
          }
        }
      }
      assert.deepEqual(problems, []);
    } finally {
      await context.close();
    }
  });
}
