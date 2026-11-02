import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const email = "errors@example.test";
const password = "Errors-test-551!";
const timeZone = "America/New_York";

let database, mongoose, apiServer, api, account, savedGeminiKey;

async function send(endpoint, { token, body, raw, method = "POST" } = {}) {
  const response = await fetch(api + endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  return { status: response.status, text, data: text ? JSON.parse(text) : null };
}

function quietErrors() {
  return mock.method(console, "error", () => {});
}

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  savedGeminiKey = process.env.GEMINI_API_KEY;
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
  apiServer = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  api = `http://127.0.0.1:${apiServer.address().port}/api`;

  const signup = await send("/auth/signup", { body: { email, password, confirmPassword: password } });
  assert.equal(signup.status, 201);
  account = signup.data;
}, { timeout: 120_000 });

after(async () => {
  if (savedGeminiKey !== undefined) process.env.GEMINI_API_KEY = savedGeminiKey;
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

test("login rejects missing email or password with 400", async () => {
  for (const body of [{}, { email }, { password }, { email: "", password }, { email, password: "" }, { email: null, password: null }]) {
    const result = await send("/auth/login", { body });
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.deepEqual(result.data, { message: "Email and password are required" });
  }
  // No body at all, and a JSON array instead of an object.
  assert.equal((await send("/auth/login")).status, 400);
  assert.equal((await send("/auth/login", { body: [email, password] })).status, 400);
});

test("login rejects non-string email or password with 400, not 500", async () => {
  const log = quietErrors();
  try {
    for (const body of [
      { email: { $gt: "" }, password },
      { email: [email], password },
      { email: 42, password },
      { email: true, password },
      { email, password: ["x"] },
      { email, password: { $ne: null } },
      { email, password: 12345678 },
    ]) {
      const result = await send("/auth/login", { body });
      assert.equal(result.status, 400, JSON.stringify(body));
      assert.deepEqual(result.data, { message: "Email and password must be text" });
    }
    assert.equal(log.mock.callCount(), 0);
  } finally {
    log.mock.restore();
  }
});

test("valid logins and wrong credentials behave as before", async () => {
  const login = await send("/auth/login", { body: { email, password } });
  assert.equal(login.status, 200);
  assert.equal(typeof login.data.token, "string");
  assert.equal(login.data.user.id, account.user.id);
  assert.equal(login.data.user.email, email);
  assert.equal("passwordHash" in login.data.user, false);
  const me = await send("/auth/me", { token: login.data.token, method: "GET" });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, email);

  // Email is still trimmed and lowercased before lookup.
  assert.equal((await send("/auth/login", { body: { email: `  ${email.toUpperCase()} `, password } })).status, 200);

  for (const body of [{ email, password: "Wrong-password-9!" }, { email: "nobody@example.test", password }]) {
    const result = await send("/auth/login", { body });
    assert.equal(result.status, 401);
    assert.deepEqual(result.data, { message: "Invalid email or password" });
  }
});

test("unexpected server errors return a generic 500 and are logged without reaching the client", async () => {
  const secret = process.env.JWT_SECRET;
  const log = quietErrors();
  try {
    // A valid login with no signing secret configured throws inside the route.
    delete process.env.JWT_SECRET;
    const result = await send("/auth/login", { body: { email, password } });
    assert.equal(result.status, 500);
    assert.deepEqual(result.data, { message: "Internal server error" });
    assert.doesNotMatch(result.text, /JWT_SECRET|configured|stack|\.js:\d+/);
    assert.equal(log.mock.callCount(), 1);
    assert.match(String(log.mock.calls[0].arguments[0]?.message), /JWT_SECRET is not configured/);
  } finally {
    process.env.JWT_SECRET = secret;
    log.mock.restore();
  }
});

test("malformed JSON stays a 400 and the raw body is never logged", async () => {
  const log = quietErrors();
  try {
    const result = await send("/auth/login", { raw: `{"email":"${email}","password":"${password}"` });
    assert.equal(result.status, 400);
    assert.equal(typeof result.data.message, "string");
    assert.notEqual(result.data.message, "Internal server error");
    assert.doesNotMatch(result.text, new RegExp(password));
    assert.equal(log.mock.callCount(), 0);
  } finally {
    log.mock.restore();
  }
});

test("intentional 4xx responses and AI 503s are unchanged", async () => {
  const { token } = account;
  assert.deepEqual(await send("/auth/me", { method: "GET" }).then((r) => [r.status, r.data]), [401, { message: "Unauthorized" }]);
  assert.deepEqual(
    await send("/auth/signup", { body: { email: "short@example.test", password: "short", confirmPassword: "short" } })
      .then((r) => [r.status, r.data]),
    [400, { message: "Password must be at least 8 characters and include 1 number and 1 symbol" }],
  );
  assert.deepEqual(
    await send("/auth/signup", { body: { email, password, confirmPassword: password } }).then((r) => [r.status, r.data]),
    [409, { message: "An account with this email already exists" }],
  );
  assert.deepEqual(
    await send("/workouts/not-an-id", { token, method: "DELETE" }).then((r) => [r.status, r.data]),
    [400, { message: "Invalid workout ID." }],
  );
  assert.deepEqual(
    await send("/goals/0123456789abcdef01234567", { token, method: "DELETE" }).then((r) => [r.status, r.data]),
    [404, { message: "Goal not found." }],
  );
  const invalidWorkout = await send("/workouts", { token, body: { name: "", date: "2026-02-30", timeZone } });
  assert.equal(invalidWorkout.status, 400);
  assert.equal(invalidWorkout.data.message, "Check the workout details.");
  assert.ok(invalidWorkout.data.errors.name && invalidWorkout.data.errors.date);
  assert.deepEqual(
    await send("/insights", { token, body: { timeZone: "Not/AZone" } }).then((r) => [r.status, r.data]),
    [400, { message: "Use a valid timezone." }],
  );

  // AI routes answer their own 503s; the error handler must not replace these messages.
  assert.deepEqual(
    await send("/nutrition/estimate", { token, body: { foodName: "Oatmeal with berries" } }).then((r) => [r.status, r.data]),
    [503, { message: "AI estimates are not configured yet. You can enter values manually." }],
  );
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  for (const name of ["Walk", "Run", "Cycle"]) {
    assert.equal((await send("/workouts", { token, body: { name, date: today, durationMinutes: 20, timeZone } })).status, 201);
  }
  assert.deepEqual(
    await send("/insights", { token, body: { timeZone } }).then((r) => [r.status, r.data]),
    [503, { message: "AI insights are not configured yet." }],
  );
});
