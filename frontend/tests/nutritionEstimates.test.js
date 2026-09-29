import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateMeal, findMealReference, mealReferences } from "../../shared/nutritionEstimates.mjs";

test("common meal names match references without guessing unrecognized additions", () => {
  assert.equal(findMealReference("  OATMEAL  with berries ").id, "berry-oatmeal");
  assert.equal(findMealReference("yoghurt parfait").id, "yogurt-parfait");
  for (const name of ["pizza", "oatmeal with berries and peanut butter", "2 bowls of oatmeal with berries", "chicken wrap with extra cheese", "", null]) {
    assert.equal(findMealReference(name), undefined);
  }
});

test("estimates scale all four nutrients and reject invalid portions", () => {
  assert.deepEqual(estimateMeal("berry-oatmeal", 2), { calories: 414, protein: 16.8, carbohydrates: 67.6, fat: 7.8 });
  assert.deepEqual(estimateMeal("yogurt-parfait", 0.5), { calories: 129.5, protein: 4.5, carbohydrates: 21.5, fat: 3 });
  for (const amount of [null, "2", 0, -1, 11, Infinity, NaN]) assert.equal(estimateMeal("berry-oatmeal", amount), null);
  assert.equal(estimateMeal("not-a-meal", 1), null);
  for (const meal of mealReferences) {
    assert.ok(meal.portion);
    assert.ok(meal.url.startsWith("https://"));
    assert.equal(Object.keys(estimateMeal(meal.id)).length, 4);
  }
});
