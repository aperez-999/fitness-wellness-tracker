import assert from "node:assert/strict";
import test from "node:test";

import { formatGoalDate, goalSnapshot } from "../src/lib/dashboardSummary.js";

const today = "2026-10-29";
const goal = (overrides = {}) => ({
  _id: "goal-1",
  title: "Drink water",
  category: "wellness",
  currentValue: 5,
  targetValue: 8,
  unit: "glasses",
  targetDate: "2026-11-05T00:00:00.000Z",
  ...overrides,
});

test("shows saved progress against the target with the unit", () => {
  const snapshot = goalSnapshot(goal(), today);
  assert.equal(snapshot.id, "goal-1");
  assert.equal(snapshot.progressText, "5 / 8 glasses");
  assert.equal(snapshot.percent, 62.5);
  assert.equal(snapshot.reached, false);
  assert.equal(goalSnapshot(goal({ unit: undefined }), today).progressText, "5 / 8");
});

test("hour goals show two decimals, like the Goals page", () => {
  const hours = goal({ currentValue: 100 / 60, targetValue: 2, unit: "hours", tracking: "workoutHours" });
  assert.equal(goalSnapshot(hours, today).progressText, "1.67 / 2 hours");
});

test("due dates use the Goals page wording", () => {
  assert.equal(goalSnapshot(goal(), today).dueText, `Due ${formatGoalDate("2026-11-05")}`);
  const dueToday = goalSnapshot(goal({ targetDate: "2026-10-29T00:00:00.000Z" }), today);
  assert.equal(dueToday.dueText, "Due today");
  assert.equal(dueToday.overdue, false);
  const late = goalSnapshot(goal({ targetDate: "2026-10-28T00:00:00.000Z" }), today);
  assert.equal(late.overdue, true);
  assert.equal(late.dueText, `Overdue since ${formatGoalDate("2026-10-28")}`);
});

test("a goal at or past its target is reached and its bar stops at 100%", () => {
  assert.equal(goalSnapshot(goal({ currentValue: 8 }), today).reached, true);
  const past = goalSnapshot(goal({ currentValue: 12 }), today);
  assert.equal(past.reached, true);
  assert.equal(past.percent, 100);
});

test("a goal with no progress yet starts at zero", () => {
  const snapshot = goalSnapshot(goal({ currentValue: 0 }), today);
  assert.equal(snapshot.percent, 0);
  assert.equal(snapshot.progressText, "0 / 8 glasses");
});
