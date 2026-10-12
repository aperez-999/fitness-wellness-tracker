import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const root = fileURLToPath(new URL("../", import.meta.url));
const importLocal = (file) => import(pathToFileURL(path.join(root, file)).href);
const password = "Workflow-test-417!";
const timeZone = "America/New_York";

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

let database, mongoose, apiServer, api, User, Workout, NutritionLog, Goal;

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
}, { timeout: 120_000 });

after(async () => {
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  await mongoose?.disconnect();
  await database?.stop();
});

test("a new account can log activity, see it in analytics, and keep other records private", async () => {
  const email = "workflow@example.test";
  const mismatched = await request("/auth/signup", null, {
    email,
    password,
    confirmPassword: "Different-pass-1!",
    displayName: "Workflow",
  });
  assert.equal(mismatched.status, 400);
  assert.equal(await User.countDocuments({ email }), 0);

  const signup = await request("/auth/signup", null, {
    email,
    password,
    confirmPassword: password,
    displayName: "Workflow",
  });
  assert.equal(signup.status, 201);
  assert.ok(signup.data.token);
  const userId = signup.data.user.id;

  const badLogin = await request("/auth/login", null, { email, password: "Wrong-password-9!" });
  assert.equal(badLogin.status, 401);

  const login = await request("/auth/login", null, { email, password });
  assert.equal(login.status, 200);
  const token = login.data.token;
  assert.equal(login.data.user.email, email);
  assert.equal((await request("/auth/me", token)).data.user.id, userId);
  assert.equal((await request("/workouts", undefined)).status, 401);

  const today = todayKey();
  const workout = {
    name: "Morning walk",
    date: today,
    durationMinutes: 30,
    timeZone,
  };
  const invalidWorkout = await request("/workouts", token, { ...workout, durationMinutes: -5 });
  assert.equal(invalidWorkout.status, 400);
  assert.equal(await Workout.countDocuments({ userId }), 0);

  const created = await request("/workouts", token, { ...workout, userId: "someone-else" });
  assert.equal(created.status, 201);
  const workoutId = created.data.workout._id;
  const stored = await Workout.findById(workoutId).lean();
  assert.equal(String(stored.userId), userId);
  assert.equal(stored.durationMinutes, 30);

  const listed = await request("/workouts", token);
  assert.equal(listed.data.workouts[0]._id, workoutId);

  const summary = await request(`/workouts/summary?timeZone=${encodeURIComponent(timeZone)}`, token);
  assert.equal(summary.status, 200);
  assert.equal(summary.data.daily.reduce((total, day) => total + day.count, 0), 1);
  assert.equal(summary.data.daily.reduce((total, day) => total + day.minutes, 0), 30);

  const analytics = await request(`/workouts/analytics?timeZone=${encodeURIComponent(timeZone)}`, token);
  const todayStats = analytics.data.daily.find((day) => day.date === today);
  assert.equal(todayStats.count, 1);
  assert.equal(todayStats.minutes, 30);

  const edited = await request(`/workouts/${workoutId}`, token, { ...workout, durationMinutes: 45 }, "PUT");
  assert.equal(edited.status, 200);
  const afterEdit = await request(`/workouts/summary?timeZone=${encodeURIComponent(timeZone)}`, token);
  assert.equal(afterEdit.data.daily.reduce((total, day) => total + day.minutes, 0), 45);

  assert.equal((await request(`/workouts/${workoutId}`, token, undefined, "DELETE")).status, 204);
  assert.equal(await Workout.findById(workoutId), null);
  const afterDelete = await request(`/workouts/summary?timeZone=${encodeURIComponent(timeZone)}`, token);
  assert.equal(afterDelete.data.daily.reduce((total, day) => total + day.count, 0), 0);

  const meal = {
    date: "2026-09-28",
    foodName: "Oatmeal with berries",
    calories: 420,
    protein: 18,
    carbohydrates: 62,
    fat: 11,
  };
  assert.equal((await request("/nutrition", token, { ...meal, calories: -1 })).status, 400);
  const savedMeal = await request("/nutrition", token, meal);
  assert.equal(savedMeal.status, 201);
  const storedMeal = await NutritionLog.findById(savedMeal.data.entry._id).lean();
  assert.equal(String(storedMeal.userId), userId);
  assert.equal(storedMeal.calories, 420);
  assert.equal((await request("/nutrition", token)).data.entries[0]._id, savedMeal.data.entry._id);

  const goal = {
    title: "Walk 10 miles",
    category: "workout",
    targetValue: 10,
    currentValue: 2,
    unit: "miles",
    targetDate: daysFromNow(14),
    timeZone,
  };
  const savedGoal = await request("/goals", token, goal);
  assert.equal(savedGoal.status, 201);
  const goalId = savedGoal.data.goal._id;
  assert.equal(String((await Goal.findById(goalId).lean()).userId), userId);
  const progressed = await request(`/goals/${goalId}`, token, { ...goal, currentValue: 4 }, "PUT");
  assert.equal(progressed.status, 200);
  assert.equal(progressed.data.goal.currentValue, 4);
  assert.equal((await Goal.findById(goalId).lean()).currentValue, 4);
  assert.equal((await request("/goals", token)).data.goals[0]._id, goalId);

  const badProfile = await request("/auth/me", token, {
    displayName: 12,
    pronouns: "",
    aboutMe: "",
    favoriteActivities: [],
  }, "PATCH");
  assert.equal(badProfile.status, 400);
  const savedProfile = await request("/auth/me", token, {
    displayName: "Alejandro",
    pronouns: "he/him",
    aboutMe: "Walking more this month.",
    favoriteActivities: ["Walk"],
  }, "PATCH");
  assert.equal(savedProfile.status, 200);
  assert.equal((await User.findById(userId).lean()).displayName, "Alejandro");
  assert.equal((await request("/auth/me", token)).data.user.displayName, "Alejandro");

  const other = await request("/auth/signup", null, {
    email: "other@example.test",
    password,
    confirmPassword: password,
    displayName: "Other",
  });
  const otherToken = other.data.token;
  assert.deepEqual((await request("/workouts", otherToken)).data.workouts, []);
  assert.deepEqual((await request("/nutrition", otherToken)).data.entries, []);
  assert.deepEqual((await request("/goals", otherToken)).data.goals, []);
  assert.equal((await request("/auth/me", otherToken)).data.user.email, "other@example.test");
  assert.equal((await User.findOne({ email: "other@example.test" }).lean()).displayName, "Other");

  const logout = await request("/auth/logout", token, undefined, "POST");
  assert.equal(logout.status, 200);
  assert.equal(logout.data.message, "Logged out");
});
