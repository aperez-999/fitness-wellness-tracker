import assert from "node:assert/strict";
import test from "node:test";
import {
  isCalendarDate,
  todayInZone,
  validateWorkout,
  weekBounds,
} from "../src/utils/workoutValidation.js";

const now = new Date("2026-09-19T16:00:00Z");
const valid = {
  name: "Walk",
  durationMinutes: 30,
  date: "2026-09-19",
  timeZone: "America/New_York",
};

test("validates real calendar days and leap years", () => {
  assert(isCalendarDate("2024-02-29"));
  for (const value of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-09-01T00:00:00Z",
    null,
    {},
  ]) {
    assert.equal(isCalendarDate(value), false);
  }
});

test("uses the user's timezone for completed workouts", () => {
  assert.equal(todayInZone("Pacific/Kiritimati", now), "2026-09-20");
  assert.equal(todayInZone("America/Los_Angeles", now), "2026-09-19");
  assert(validateWorkout({ ...valid, date: "2026-09-20" }, now).errors.date);
  assert(
    validateWorkout(
      { ...valid, date: "2026-09-20", timeZone: "Pacific/Kiritimati" },
      now,
    ).workout,
  );
  for (const timeZone of ["invalid", {}, null, []])
    assert(validateWorkout({ ...valid, timeZone }, now).errors.timeZone);
});

test("rejects invalid names, notes, and durations with field errors", () => {
  for (const name of ["", "   ", 42, {}, "a".repeat(121)])
    assert(validateWorkout({ ...valid, name }, now).errors.name);
  for (const notes of [false, [], "a".repeat(2001)])
    assert(validateWorkout({ ...valid, notes }, now).errors.notes);
  for (const durationMinutes of [
    -1,
    Infinity,
    NaN,
    "NaN",
    "Infinity",
    " ",
    true,
    [],
    {},
    { toString: null, valueOf: null },
    [{ toString: null }],
  ]) {
    assert(
      validateWorkout({ ...valid, durationMinutes }, now).errors
        .durationMinutes,
    );
  }
});

test("requires duration, preserves zero and decimals, and trims text", () => {
  for (const durationMinutes of [undefined, null, ""]) {
    assert(
      validateWorkout({ ...valid, durationMinutes }, now).errors
        .durationMinutes,
    );
  }
  for (const durationMinutes of [0, "0", 12.5, "12.5"]) {
    assert.equal(
      validateWorkout({ ...valid, durationMinutes }, now).workout
        .durationMinutes,
      Number(durationMinutes),
    );
  }
  assert.equal(
    validateWorkout({ ...valid, name: " Walk ", notes: " steady " }, now)
      .workout.name,
    "Walk",
  );
  assert.equal(
    validateWorkout({ ...valid, notes: " steady " }, now).workout.notes,
    "steady",
  );
});

test("week bounds include Sunday, reset Monday, and cross year and DST boundaries", () => {
  for (const [today, monday, tomorrow] of [
    ["2026-01-04", "2025-12-29", "2026-01-05"],
    ["2026-01-05", "2026-01-05", "2026-01-06"],
    ["2026-03-08", "2026-03-02", "2026-03-09"],
    ["2026-11-01", "2026-10-26", "2026-11-02"],
  ]) {
    const { start, end } = weekBounds(today);
    assert.equal(start.toISOString().slice(0, 10), monday);
    assert.equal(end.toISOString().slice(0, 10), tomorrow);
  }
});
