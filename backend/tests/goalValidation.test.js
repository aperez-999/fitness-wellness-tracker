import assert from "node:assert/strict";
import test from "node:test";

import { validateGoal } from "../src/utils/goalValidation.js";

// A fixed "now" so date checks give the same answer every time the tests run.
const now = new Date("2026-09-30T16:00:00Z");
const valid = {
  title: "Run 20 miles",
  category: "workout",
  targetValue: 20,
  unit: "miles",
  targetDate: "2026-10-31",
  timeZone: "America/New_York",
};

test("accepts a valid goal and cleans up its values", () => {
  const { goal, errors } = validateGoal(
    { ...valid, title: "  Run 20 miles  ", unit: " miles ", targetValue: "20" },
    { now },
  );
  assert.equal(errors, undefined);
  assert.deepEqual(goal, {
    title: "Run 20 miles",
    category: "workout",
    targetValue: 20,
    currentValue: 0,
    unit: "miles",
    targetDate: "2026-10-31",
    tracking: "manual",
  });
});

test("requires a name, type, target value, and target date", () => {
  const { errors } = validateGoal({}, { now });
  for (const field of ["title", "category", "targetValue", "targetDate"]) {
    assert(errors[field], `expected an error for ${field}`);
  }
  assert(validateGoal(undefined, { now }).errors.title);
  assert(validateGoal([], { now }).errors.title);
});

test("rejects bad names and types", () => {
  for (const title of ["", "   ", 42, null, {}, "a".repeat(121)]) {
    assert(validateGoal({ ...valid, title }, { now }).errors.title);
  }
  assert.equal(validateGoal({ ...valid, title: "a".repeat(120) }, { now }).goal.title.length, 120);
  for (const category of ["sleep", "Workout", "", null, 1]) {
    assert.equal(
      validateGoal({ ...valid, category }, { now }).errors.category,
      "Choose workout, nutrition, or wellness.",
    );
  }
});

test("target must be a number above zero and not absurdly large", () => {
  for (const targetValue of [0, "0", -5, "-5", "", " ", "abc", NaN, Infinity, true, [], {}]) {
    assert.equal(
      validateGoal({ ...valid, targetValue }, { now }).errors.targetValue,
      "Enter a target above zero.",
    );
  }
  assert(validateGoal({ ...valid, targetValue: 10_000_001 }, { now }).errors.targetValue);
  for (const targetValue of [0.5, "2.5", 10_000_000]) {
    assert.equal(validateGoal({ ...valid, targetValue }, { now }).goal.targetValue, Number(targetValue));
  }
});

test("progress is optional, can be zero, and may pass the target", () => {
  for (const currentValue of [undefined, null, ""]) {
    assert.equal(validateGoal({ ...valid, currentValue }, { now }).goal.currentValue, 0);
  }
  assert.equal(validateGoal({ ...valid, currentValue: 25 }, { now }).goal.currentValue, 25);
  for (const currentValue of [-1, "-1", "abc", Infinity, true]) {
    assert(validateGoal({ ...valid, currentValue }, { now }).errors.currentValue);
  }
});

test("unit is optional and limited to 30 characters", () => {
  assert.equal(validateGoal({ ...valid, unit: undefined }, { now }).goal.unit, undefined);
  assert.equal(validateGoal({ ...valid, unit: "   " }, { now }).goal.unit, undefined);
  for (const unit of ["a".repeat(31), 5, []]) {
    assert(validateGoal({ ...valid, unit }, { now }).errors.unit);
  }
});

test("target date must be a real day, today or later, in the user's timezone", () => {
  for (const targetDate of [undefined, null, ""]) {
    assert.equal(validateGoal({ ...valid, targetDate }, { now }).errors.targetDate, "Choose a target date.");
  }
  for (const targetDate of ["2026-02-30", "10/31/2026", " ", 20261031]) {
    assert.equal(
      validateGoal({ ...valid, targetDate }, { now }).errors.targetDate,
      "Enter a valid date in YYYY-MM-DD format.",
    );
  }
  assert.equal(
    validateGoal({ ...valid, targetDate: "2026-09-29" }, { now }).errors.targetDate,
    "Choose today or a later date.",
  );
  assert(validateGoal({ ...valid, targetDate: "2026-09-30" }, { now }).goal);
  // At 16:00 UTC it is already October 1 in Kiritimati, so September 30 is in the past there.
  assert(validateGoal({ ...valid, targetDate: "2026-09-30", timeZone: "Pacific/Kiritimati" }, { now }).errors.targetDate);
  for (const timeZone of ["Not/AZone", {}, []]) {
    assert(validateGoal({ ...valid, timeZone }, { now }).errors.timeZone);
  }
});

test("updates may keep a past date and change status", () => {
  const overdue = { ...valid, targetDate: "2026-09-01", status: "completed" };
  const kept = validateGoal(overdue, { now, mode: "update", currentTargetDate: "2026-09-01" });
  assert.equal(kept.goal.targetDate, "2026-09-01");
  assert.equal(kept.goal.status, "completed");
  // A different past date is still rejected.
  assert(validateGoal(overdue, { now, mode: "update", currentTargetDate: "2026-09-15" }).errors.targetDate);
  assert(validateGoal({ ...valid, status: "done" }, { now, mode: "update" }).errors.status);
  // New goals always start active, whatever the browser sends.
  assert.equal(validateGoal({ ...valid, status: "completed" }, { now }).goal.status, undefined);
});

test("completing a goal raises progress to the target", () => {
  const complete = (currentValue, options = {}) =>
    validateGoal({ ...valid, currentValue, status: "completed" }, { now, mode: "update", ...options }).goal;
  assert.equal(complete(5).currentValue, 20);
  assert.equal(complete(undefined).currentValue, 20);
  // Going past the target is kept.
  assert.equal(complete(25).currentValue, 25);
  // A progress-only update to an already completed goal can't lower it below the target.
  const progressOnly = validateGoal({ ...valid, currentValue: 3 }, { now, mode: "update", currentStatus: "completed" });
  assert.equal(progressOnly.goal.currentValue, 20);
  assert.equal(progressOnly.goal.status, undefined);
  // Active goals and reopened goals keep whatever progress was sent.
  assert.equal(validateGoal({ ...valid, currentValue: 3 }, { now, mode: "update", currentStatus: "active" }).goal.currentValue, 3);
  assert.equal(validateGoal({ ...valid, currentValue: 3, status: "active" }, { now, mode: "update", currentStatus: "completed" }).goal.currentValue, 3);
  // New goals ignore status entirely.
  assert.equal(validateGoal({ ...valid, currentValue: 3, status: "completed" }, { now }).goal.currentValue, 3);
});

test("goals are manual unless a workout goal counts workouts or minutes", () => {
  const manual = validateGoal({ ...valid, startDate: "2026-10-01" }, { now }).goal;
  assert.equal(manual.tracking, "manual");
  assert.equal(manual.currentValue, 0);
  // Manual goals don't use a start date, so one sent by the browser is ignored.
  assert.equal(manual.startDate, undefined);
  for (const tracking of ["steps", "", 1, "WorkoutCount"]) {
    assert.equal(
      validateGoal({ ...valid, tracking }, { now }).errors.tracking,
      "Choose manual, workout count, or workout minutes.",
    );
  }
  for (const category of ["nutrition", "wellness"]) {
    assert.equal(
      validateGoal({ ...valid, category, tracking: "workoutMinutes", startDate: "2026-10-01" }, { now }).errors.tracking,
      "Only workout goals can count your workouts.",
    );
  }
});

test("tracked goals need a start date and use a fixed unit instead of saved progress", () => {
  const tracked = { ...valid, tracking: "workoutCount", startDate: "2026-10-01" };
  // The unit and progress sent by the browser are ignored, even if they're invalid.
  const { goal, errors } = validateGoal({ ...tracked, unit: "a".repeat(31), currentValue: "abc" }, { now });
  assert.equal(errors, undefined);
  assert.deepEqual(goal, {
    title: "Run 20 miles",
    category: "workout",
    targetValue: 20,
    unit: "workouts",
    targetDate: "2026-10-31",
    tracking: "workoutCount",
    startDate: "2026-10-01",
  });
  assert.equal(validateGoal({ ...tracked, tracking: "workoutMinutes" }, { now }).goal.unit, "minutes");

  for (const startDate of [undefined, null, ""]) {
    assert.equal(validateGoal({ ...tracked, startDate }, { now }).errors.startDate, "Choose a start date.");
  }
  for (const startDate of ["2026-02-30", "10/01/2026", 20261001]) {
    assert.equal(
      validateGoal({ ...tracked, startDate }, { now }).errors.startDate,
      "Enter a valid date in YYYY-MM-DD format.",
    );
  }
  assert.equal(
    validateGoal({ ...tracked, startDate: "2026-11-01" }, { now }).errors.startDate,
    "Choose a start date on or before the target date.",
  );
  // A past start date and a start date equal to the target date are both fine.
  assert.equal(validateGoal({ ...tracked, startDate: "2026-09-01" }, { now }).goal.startDate, "2026-09-01");
  assert.equal(validateGoal({ ...tracked, startDate: "2026-10-31" }, { now }).goal.startDate, "2026-10-31");
});

test("updates keep the saved tracking unless a new one is sent", () => {
  const update = (body, options) => validateGoal({ ...valid, ...body }, { now, mode: "update", ...options });
  assert.equal(update({ startDate: "2026-10-01" }, { currentTracking: "workoutCount" }).goal.tracking, "workoutCount");
  // A tracked goal still needs its start date when tracking isn't sent.
  assert.equal(update({}, { currentTracking: "workoutCount" }).errors.startDate, "Choose a start date.");
  // Goals saved before tracking existed count as manual.
  assert.equal(update({}, { currentTracking: undefined }).goal.tracking, "manual");
  // Switching back to manual brings progress back.
  const reverted = update({ tracking: "manual", currentValue: 7 }, { currentTracking: "workoutMinutes" }).goal;
  assert.equal(reverted.tracking, "manual");
  assert.equal(reverted.currentValue, 7);
  assert.equal(reverted.unit, "miles");
  // Completing a tracked goal doesn't touch saved progress; it comes from workouts.
  const completed = update(
    { tracking: "workoutCount", startDate: "2026-10-01", status: "completed" },
    { currentStatus: "active" },
  ).goal;
  assert.equal(completed.status, "completed");
  assert.equal(completed.currentValue, undefined);
});
