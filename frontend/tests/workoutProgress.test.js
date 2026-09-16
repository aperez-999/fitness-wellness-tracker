import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWorkoutDate,
  getWorkoutProgress,
  localDateKey,
  workoutDateKey,
} from "../src/lib/workoutProgress.js";

const summary = {
  today: "2026-09-16",
  weekStart: "2026-09-14",
  recent: [],
  daily: [],
};

test("presents the backend summary as seven calendar days with totals", () => {
  const data = {
    ...summary,
    daily: [
      { date: "2026-09-14", count: 2, minutes: 45, durationsRecorded: 2 },
      { date: "2026-09-16", count: 1, minutes: 0, durationsRecorded: 0 },
    ],
  };
  const snapshot = structuredClone(data);
  const progress = getWorkoutProgress(data);
  assert.equal(progress.count, 3);
  assert.equal(progress.minutes, 45);
  assert.equal(progress.activeDays, 2);
  assert.equal(progress.durationsRecorded, 2);
  assert.deepEqual(
    progress.days.map((day) => day.count),
    [2, 0, 1, 0, 0, 0, 0],
  );
  assert(progress.days[2].isToday);
  assert(progress.days[3].isFuture);
  assert.deepEqual(data, snapshot);
});

test("keeps recorded zero distinct from missing durations", () => {
  const progress = getWorkoutProgress({
    ...summary,
    daily: [{ date: "2026-09-14", count: 2, minutes: 0, durationsRecorded: 1 }],
  });
  assert.equal(progress.minutes, 0);
  assert.equal(progress.count, 2);
  assert.equal(progress.durationsRecorded, 1);
});

test("formats date-only workouts without shifting them into the previous day", () => {
  assert.equal(workoutDateKey("2026-09-14T00:00:00Z"), "2026-09-14");
  assert.match(formatWorkoutDate("2026-09-14T00:00:00Z", true), /14/);
  assert.equal(localDateKey(new Date(2026, 8, 14, 23, 59)), "2026-09-14");
  assert.equal(localDateKey(new Date(2026, 8, 15, 0, 1)), "2026-09-15");
  assert.equal(workoutDateKey("2026-02-30"), null);
  assert.equal(workoutDateKey(null), null);
});

test("renders a complete empty week and distinguishes unloaded data", () => {
  assert.equal(getWorkoutProgress(null), null);
  const progress = getWorkoutProgress(summary);
  assert.equal(progress.count, 0);
  assert.equal(progress.activeDays, 0);
  assert.equal(progress.days.length, 7);
  assert.deepEqual(progress.recent, []);
});

test("keeps seven consecutive days across DST and year boundaries", () => {
  for (const [weekStart, today, end] of [
    ["2025-12-29", "2026-01-04", "2026-01-04"],
    ["2026-03-02", "2026-03-08", "2026-03-08"],
    ["2026-10-26", "2026-11-01", "2026-11-01"],
  ]) {
    const progress = getWorkoutProgress({ ...summary, weekStart, today });
    assert.equal(progress.days[0].key, weekStart);
    assert.equal(progress.days[6].key, end);
    assert.equal(new Set(progress.days.map((day) => day.key)).size, 7);
    assert(progress.days[6].isToday);
  }
});
