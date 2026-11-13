/**
 * Local API latency sample for Capstone 2 QoS evidence.
 * Ephemeral MongoDB, no .env, no Gemini calls.
 *
 *   node scripts/perf-qos-sample.mjs
 *   node scripts/perf-qos-sample.mjs --requests 25 --csv docs/capstone-2/performance-evaluation-sample.csv
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);

const args = process.argv.slice(2);
const requestCount = Number(args[args.indexOf("--requests") + 1]) || 25;
const csvPath = args.includes("--csv")
  ? args[args.indexOf("--csv") + 1]
  : "";

const password = "Perf-sample-902!";
const timeZone = "America/New_York";

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    n: sorted.length,
    min: sorted[0] ?? 0,
    p50: percentile(sorted, 50),
    avg: sorted.length ? sum / sorted.length : 0,
    p95: percentile(sorted, 95),
    max: sorted.at(-1) ?? 0,
  };
}

async function main() {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const { default: express } = await importLocal("backend/node_modules/express/index.js");
  const { default: cors } = await importLocal("backend/node_modules/cors/lib/index.js");
  const { default: mongoose } = await importLocal("backend/node_modules/mongoose/index.js");
  const { MongoMemoryServer } = await importLocal(
    "tests/node_modules/mongodb-memory-server/index.js",
  );
  const database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());

  const { default: routes } = await importLocal("backend/src/routes/index.js");
  const { errorHandler } = await importLocal("backend/src/middleware/errorHandler.js");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", routes);
  app.use(errorHandler);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const signup = await fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "perf@example.test",
      password,
      confirmPassword: password,
      displayName: "Perf Sample",
    }),
  });
  const { token } = await signup.json();
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  for (let index = 0; index < 10; index++) {
    await fetch(`${base}/workouts`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: `Sample workout ${index}`,
        date: "2026-09-14",
        durationMinutes: 20 + index,
        timeZone,
      }),
    });
  }
  for (let index = 0; index < 5; index++) {
    await fetch(`${base}/nutrition`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        date: "2026-09-15",
        foodName: `Meal ${index}`,
        calories: 400 + index,
        protein: 20,
        carbohydrates: 50,
        fat: 10,
      }),
    });
  }
  await fetch(`${base}/goals`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title: "Walk 5 times",
      category: "workout",
      targetValue: 5,
      targetDate: "2026-10-31",
      timeZone,
    }),
  });

  const endpoints = [
    { name: "health", path: "/health", auth: false },
    { name: "dashboard_summary", path: `/dashboard/summary?timeZone=${encodeURIComponent(timeZone)}`, auth: true },
    { name: "workouts_list", path: "/workouts", auth: true },
    { name: "nutrition_list", path: "/nutrition", auth: true },
    { name: "goals_list", path: `/goals?status=active&timeZone=${encodeURIComponent(timeZone)}`, auth: true },
  ];

  const rows = [];
  const summary = {};

  for (const endpoint of endpoints) {
    const times = [];
    let failures = 0;
    for (let i = 0; i < requestCount; i++) {
      const headers = endpoint.auth ? { Authorization: `Bearer ${token}` } : {};
      const started = performance.now();
      const response = await fetch(`${base}${endpoint.path}`, { headers });
      const elapsed = performance.now() - started;
      times.push(elapsed);
      rows.push({
        endpoint: endpoint.name,
        iteration: i + 1,
        ms: elapsed.toFixed(3),
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) failures += 1;
    }
    summary[endpoint.name] = { ...summarize(times), failures };
  }

  // Auth check: protected route without token.
  const unauth = await fetch(`${base}/workouts`);
  summary.auth_behavior = {
    workouts_without_token: unauth.status,
  };

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await database.stop();

  const output = {
    measured_at: new Date().toISOString(),
    environment: "local_ephemeral",
    requests_per_endpoint: requestCount,
    concurrency: "sequential",
    summary,
    rows,
  };

  if (csvPath) {
    const header = "endpoint,iteration,ms,status,ok\n";
    const body = rows
      .map((row) =>
        [row.endpoint, row.iteration, row.ms, row.status, row.ok].join(","),
      )
      .join("\n");
    writeFileSync(path.join(root, csvPath), header + body + "\n");
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
