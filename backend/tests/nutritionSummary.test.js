import assert from "node:assert/strict";
import test from "node:test";

import { nutritionWeek, weeklyNutrition } from "../src/utils/nutritionSummary.js";
import { todayInZone } from "../src/utils/workoutValidation.js";

// Dates are saved at midnight UTC, so the tests build them the same way.
const meal = (key, calories) => ({ date: new Date(`${key}T00:00:00Z`), calories });

test("counts meals and calories from Monday through today", () => {
  const entries = [
    meal("2026-10-25", 500), // the Sunday before this week
    meal("2026-10-26", 320), // Monday
    meal("2026-10-27", 540),
    meal("2026-10-27", 0), // a zero-calorie entry is still a meal
    { date: new Date("2026-10-28T00:00:00Z") }, // saved without calories
    meal("2026-10-29", 710), // today
    meal("2026-10-30", 900), // dated in the future
  ];
  assert.deepEqual(weeklyNutrition(entries, "2026-10-29"), {
    weekStart: "2026-10-26",
    meals: 5,
    calories: 1570,
  });
});

test("Sunday still belongs to the week that started on Monday", () => {
  const entries = [meal("2026-10-26", 300), meal("2026-11-01", 400), meal("2026-11-02", 250)];
  assert.deepEqual(weeklyNutrition(entries, "2026-11-01"), { weekStart: "2026-10-26", meals: 2, calories: 700 });
  assert.deepEqual(weeklyNutrition(entries, "2026-11-02"), { weekStart: "2026-11-02", meals: 1, calories: 250 });
});

test("the user's time zone decides which week it is", () => {
  // Sunday 10:30 PM in New York is already Monday in UTC.
  const now = new Date("2026-11-02T03:30:00Z");
  assert.deepEqual(nutritionWeek(todayInZone("America/New_York", now)), { start: "2026-10-26", end: "2026-11-01" });
  assert.deepEqual(nutritionWeek(todayInZone(undefined, now)), { start: "2026-11-02", end: "2026-11-02" });
});

test("decimal calories add up without rounding noise", () => {
  assert.equal(weeklyNutrition([meal("2026-10-26", 0.1), meal("2026-10-26", 0.2)], "2026-10-29").calories, 0.3);
  assert.equal(weeklyNutrition([meal("2026-10-26", 120.25), meal("2026-10-27", 80.5)], "2026-10-29").calories, 200.75);
});

test("a week with no meals has zero meals and zero calories", () => {
  assert.deepEqual(weeklyNutrition([], "2026-10-29"), { weekStart: "2026-10-26", meals: 0, calories: 0 });
});
