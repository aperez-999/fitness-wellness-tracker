import assert from "node:assert/strict";
import test from "node:test";
import { getWorkoutAnalytics, shiftDay } from "../src/lib/workoutAnalytics.js";

const base = {
  today: "2026-09-16",
  weekStart: "2026-09-14",
  windowStart: "2026-08-24",
  daily: [],
};
test("compares elapsed weekdays, not a partial week against a full one", () => {
  const result = getWorkoutAnalytics({
    ...base,
    daily: [
      { date: "2026-09-14", count: 2, minutes: 45, durationsRecorded: 2 },
      { date: "2026-09-07", count: 1, minutes: 20, durationsRecorded: 1 },
      { date: "2026-09-13", count: 5, minutes: 200, durationsRecorded: 5 },
    ],
  });
  assert.equal(result.current.count, 2);
  assert.equal(result.previous.count, 1);
  assert.equal(result.previous.minutes, 20);
  assert.equal(result.timeline.length, 24);
  assert.equal(result.timeline.at(-1).date, base.today);
  assert.equal(result.week.filter((day) => day.future).length, 4);
  assert.equal(
    result.timeline.reduce((sum, day) => sum + day.count, 0),
    8,
  );
});
test("retains missing-duration counts and zero-duration records", () => {
  const result = getWorkoutAnalytics({
    ...base,
    daily: [{ date: "2026-09-14", count: 2, minutes: 0, durationsRecorded: 1 }],
  });
  assert.equal(result.current.count, 2);
  assert.equal(result.current.durationsRecorded, 1);
  assert.equal(result.current.minutes, 0);
  assert.equal(result.current.activeDays, 1);
  assert.equal(getWorkoutAnalytics(null), null);
});
test("calendar shifts and empty timelines remain consistent across year and DST boundaries", () => {
  assert.equal(shiftDay("2026-01-03", -7), "2025-12-27");
  for (const [start, end] of [
    ["2026-03-02", "2026-03-08"],
    ["2026-10-26", "2026-11-01"],
  ]) {
    const data = getWorkoutAnalytics({
      today: end,
      weekStart: start,
      windowStart: shiftDay(start, -21),
      daily: [],
    });
    assert.equal(data.timeline.length, 28);
    assert.equal(new Set(data.timeline.map((day) => day.date)).size, 28);
    assert.equal(data.current.count, 0);
    assert.equal(data.previous.count, 0);
  }
});
