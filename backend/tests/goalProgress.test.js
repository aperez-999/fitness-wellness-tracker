import assert from "node:assert/strict";
import test from "node:test";

import { progressWindow, trackedProgress } from "../src/utils/goalProgress.js";

// Dates are saved at midnight UTC, so the tests build them the same way.
const day = (key) => new Date(`${key}T00:00:00Z`);
const today = "2026-10-15";
const goal = (overrides = {}) => ({
  tracking: "workoutCount",
  targetValue: 10,
  status: "active",
  startDate: day("2026-10-01"),
  targetDate: day("2026-10-31"),
  ...overrides,
});
const workouts = [
  { date: day("2026-09-30"), durationMinutes: 100 }, // before the start date
  { date: day("2026-10-01"), durationMinutes: 30 }, // on the start date
  { date: day("2026-10-07"), durationMinutes: 20 },
  { date: day("2026-10-07"), durationMinutes: 25.5 }, // two workouts on one day
  { date: day("2026-10-15") }, // today, saved without a duration
  { date: day("2026-10-16"), durationMinutes: 90 }, // dated in the future
];

test("counts workouts from the start date through today", () => {
  assert.equal(trackedProgress(goal(), workouts, today), 4);
  assert.deepEqual(progressWindow(goal(), today), { start: "2026-10-01", end: "2026-10-15" });
});

test("minute goals add up recorded minutes and skip missing durations", () => {
  assert.equal(trackedProgress(goal({ tracking: "workoutMinutes" }), workouts, today), 75.5);
});

test("stops counting at the target date once it has passed", () => {
  const ended = goal({ targetDate: day("2026-10-07") });
  assert.deepEqual(progressWindow(ended, today), { start: "2026-10-01", end: "2026-10-07" });
  assert.equal(trackedProgress(ended, workouts, today), 3);
});

test("counts nothing when there are no workouts or the start date hasn't come yet", () => {
  assert.equal(trackedProgress(goal(), [], today), 0);
  assert.equal(trackedProgress(goal({ startDate: day("2026-10-20") }), workouts, today), 0);
});

test("completed goals still show their real count instead of the target", () => {
  assert.equal(trackedProgress(goal({ status: "completed" }), workouts, today), 4);
  assert.equal(trackedProgress(goal({ status: "completed", tracking: "workoutMinutes" }), workouts, today), 75.5);
});
