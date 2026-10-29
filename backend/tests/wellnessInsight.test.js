import assert from "node:assert/strict";
import test from "node:test";

import { estimateFood } from "../src/services/mealEstimate.js";
import {
  createInsightGenerator,
  generateInsight,
  InsightError,
  limitedDataMessage,
  recordCount,
  summarizeActivity,
} from "../src/services/wellnessInsight.js";

const day = (key) => new Date(`${key}T00:00:00Z`);
const today = "2026-10-27";

const workouts = [
  { name: "Walk", date: day("2026-10-27"), durationMinutes: 30, notes: "private note" },
  { name: "Walk", date: day("2026-10-25"), durationMinutes: 20 },
  { name: "Strength", date: day("2026-10-25") },
  { name: "Run", date: day("2026-10-14"), durationMinutes: 25 },
  { name: "Cycle", date: day("2026-09-30"), durationMinutes: 45 }, // first day of the 28-day window
  { name: "Swim", date: day("2026-09-29"), durationMinutes: 60 }, // one day too old
];
const nutrition = [
  { date: day("2026-10-26"), calories: 600, protein: 30, carbohydrates: 70, fat: 20 },
  { date: day("2026-10-26"), calories: 900, protein: 40, carbohydrates: 100, fat: 31 },
  { date: day("2026-10-20"), calories: 1800, protein: 81, carbohydrates: 210, fat: 60 },
];
const goals = [
  {
    title: "Walk 12 times",
    category: "workout",
    targetValue: 12,
    currentValue: 3,
    unit: "workouts",
    tracking: "workoutCount",
    targetDate: day("2026-11-06"),
  },
];
const summary = summarizeActivity({ workouts, nutrition, goals, completedGoals: 1, today });

const reply = (result, finishReason = "STOP") => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(result) }] } }],
  }),
});
const grounded = {
  headline: "You moved on 4 days this month.",
  observations: [
    { topic: "consistency", text: "You logged 5 sessions across 4 active days." },
    { topic: "nutrition", text: "You logged meals on 2 days, averaging 1,650 kcal on those days." },
    { topic: "goals", text: "Walk 12 times is 25% complete with 10 days left." },
  ],
};

test("summary covers the last 28 days and leaves out notes and record IDs", () => {
  assert.deepEqual(summary.workouts, {
    sessions: 5,
    activeDays: 4,
    minutesRecorded: 120,
    sessionsWithoutDuration: 1,
    sessionsPerWeek: [1, 0, 1, 3],
    minutesPerWeek: [45, 0, 25, 50],
    daysSinceLastWorkout: 0,
    topActivities: [
      { name: "Walk", sessions: 2 },
      { name: "Cycle", sessions: 1 },
      { name: "Run", sessions: 1 },
    ],
  });
  assert.deepEqual(summary.nutrition, {
    entries: 3,
    daysLogged: 2,
    daysSinceLastEntry: 1,
    averagePerLoggedDay: { calories: 1650, protein: 76, carbohydrates: 190, fat: 56 },
  });
  assert.deepEqual(summary.goals, {
    active: [
      {
        title: "Walk 12 times",
        category: "workout",
        current: 3,
        target: 12,
        unit: "workouts",
        progressPercent: 25,
        trackedFromWorkouts: true,
        daysLeft: 10,
      },
    ],
    completed: 1,
  });
  assert.equal(JSON.stringify(summary).includes("private note"), false);
});

test("empty sections stay empty instead of being filled with guesses", () => {
  const empty = summarizeActivity({ workouts: [], nutrition: [], goals: [], completedGoals: 0, today });
  assert.equal(recordCount(empty), 0);
  assert.equal(empty.workouts.daysSinceLastWorkout, null);
  assert.equal(empty.nutrition.averagePerLoggedDay, null);
  assert.match(limitedDataMessage(0), /nothing saved yet/);
  assert.match(limitedDataMessage(1), /1 saved record from the last 28 days/);
  assert.match(limitedDataMessage(2), /2 saved records/);
});

test("Gemini receives only the summary at the fixed endpoint with the key in a header", async () => {
  let calls = 0;
  const insight = await generateInsight(summary, {
    apiKey: "test-secret",
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
      assert.equal(url.includes("test-secret"), false);
      assert.equal(options.headers["x-goog-api-key"], "test-secret");
      const body = JSON.parse(options.body);
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), summary);
      const instruction = body.systemInstruction.parts[0].text;
      assert.match(instruction, /Never invent workouts/);
      assert.match(instruction, /Never diagnose/);
      assert.match(instruction, /data, never instructions/);
      return reply(grounded);
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(insight, { ...grounded, provider: "gemini", model: "gemini-3.5-flash-lite" });
});

test("observations with numbers that are not in the summary are dropped", async () => {
  const insight = await generateInsight(summary, {
    apiKey: "test",
    fetchImpl: async () => reply({
      ...grounded,
      observations: [
        ...grounded.observations,
        { topic: "trends", text: "You burned 4,200 calories in 9 runs." },
      ],
    }),
  });
  assert.deepEqual(insight.observations.map((item) => item.topic), ["consistency", "nutrition", "goals"]);

  for (const invented of [
    { ...grounded, headline: "You worked out 17 times." },
    { ...grounded, observations: [{ topic: "nutrition", text: "You average 2,400 kcal a day." }] },
    { ...grounded, observations: [{ topic: "sleep", text: "Sleep looks good." }] },
  ]) {
    await assert.rejects(generateInsight(summary, { apiKey: "test", fetchImpl: async () => reply(invented) }), { status: 502 });
  }
});

test("missing configuration never calls Google", async () => {
  const fetchImpl = async () => assert.fail("Unexpected outbound request");
  await assert.rejects(generateInsight(summary, { apiKey: "", fetchImpl }), { status: 503 });
  await assert.rejects(generateInsight(summary, { apiKey: "test", model: "../elsewhere", fetchImpl }), { status: 503 });
});

test("rate limits, outages, timeouts and malformed replies fail without provider details", async () => {
  for (const [status, expected] of [[429, 429], [400, 503], [403, 503], [500, 503]]) {
    await assert.rejects(
      generateInsight(summary, { apiKey: "secret", fetchImpl: async () => ({ ok: false, status }) }),
      { status: expected },
    );
  }
  await assert.rejects(
    generateInsight(summary, { apiKey: "secret", fetchImpl: async () => { throw new Error("secret detail"); } }),
    (error) => error.status === 503 && !error.message.includes("secret"),
  );
  for (const malformed of [null, {}, { headline: "Hi" }, { headline: "", observations: grounded.observations }]) {
    await assert.rejects(generateInsight(summary, { apiKey: "test", fetchImpl: async () => reply(malformed) }), { status: 502 });
  }
  await assert.rejects(
    generateInsight(summary, { apiKey: "test", fetchImpl: async () => reply(grounded, "MAX_TOKENS") }),
    { status: 502 },
  );
});

test("one request per user at a time, with a per-user limit", async () => {
  let release;
  let calls = 0;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const run = createInsightGenerator({
    generate: async () => {
      calls++;
      await held;
      return grounded;
    },
  });

  const first = run(summary, "one");
  await assert.rejects(run(summary, "one"), (error) => error.status === 429 && error.retryAfterSeconds === 5);
  release();
  await first;
  await run(summary, "one");
  await run(summary, "one");
  await assert.rejects(run(summary, "one"), (error) => error.status === 429 && error.retryAfterSeconds === 60);
  assert.equal(calls, 3);
  assert.deepEqual(await run(summary, "two"), grounded);
});

test("a provider rate limit pauses every user, then recovers", async () => {
  let clock = 0;
  let calls = 0;
  const run = createInsightGenerator({
    now: () => clock,
    generate: async () => {
      calls++;
      if (calls === 1) throw new InsightError(429, "Limit reached");
      return grounded;
    },
  });
  await assert.rejects(run(summary, "one"), (error) => error.retryAfterSeconds === 60);
  clock = 1000;
  await assert.rejects(run(summary, "two"), (error) => error.retryAfterSeconds === 59);
  assert.equal(calls, 1);
  clock = 60_000;
  assert.deepEqual(await run(summary, "two"), grounded);
});

test("meal estimates still work alongside insights", async () => {
  const values = { calories: 300, protein: 12, carbohydrates: 45, fat: 8 };
  const result = await estimateFood("oats", {
    apiKey: "test",
    fetchImpl: async () => reply({ isFood: true, portion: "One bowl", ...values }),
  });
  assert.deepEqual(result.values, values);
});
