import assert from "node:assert/strict";
import { test } from "node:test";
import { validateNutrition, nutritionFields } from "../src/utils/nutritionValidation.js";

const valid = { date: "2026-09-28", calories: 450, protein: 30.5, carbohydrates: 45, fat: 15 };

test("nutrition accepts required values, zero and decimals, and ignores client ownership", () => {
  assert.deepEqual(validateNutrition({ ...valid, protein: "0", foodName: " Lunch ", userId: "attacker" }), {
    entry: { ...valid, protein: 0, foodName: "Lunch" },
  });
});

test("nutrition accepts decimal input formats supported by number fields", () => {
  for (const [input, expected] of [[".5", 0.5], ["1.", 1], ["1e2", 100], ["1e-2", 0.01]]) {
    assert.equal(validateNutrition({ ...valid, protein: input }).entry.protein, expected);
  }
});

test("nutrition rejects missing, non-finite, negative and non-numeric nutrients", () => {
  for (const field of nutritionFields) {
    for (const value of [undefined, null, "", " ", false, [], {}, -1, "-1", "abc", "0x10", NaN, Infinity, 1e100]) {
      assert.ok(validateNutrition({ ...valid, [field]: value }).errors[field], `${field}: ${String(value)}`);
    }
  }
});

test("nutrition rejects missing bodies, impossible dates, timestamps and invalid optional fields", () => {
  for (const body of [undefined, null, [], "text", {}]) {
    assert.equal(Object.keys(validateNutrition(body).errors).length, 5);
  }
  for (const date of [null, "", "2026-02-29", "2026-13-01", "2026-09-28T00:00:00Z", 1]) {
    assert.ok(validateNutrition({ ...valid, date }).errors.date);
  }
  assert.ok(validateNutrition({ ...valid, foodName: "a".repeat(121) }).errors.foodName);
  assert.ok(validateNutrition({ ...valid, mealType: "invalid" }).errors.mealType);
  assert.ok(validateNutrition({ ...valid, date: "2024-02-29" }).entry);
});
