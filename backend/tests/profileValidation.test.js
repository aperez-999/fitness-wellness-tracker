import assert from "node:assert/strict";
import test from "node:test";

import { validateProfileUpdate } from "../src/utils/profileValidation.js";

const blank = {
  displayName: "",
  pronouns: "",
  aboutMe: "",
  favoriteActivities: [],
};

test("accepts trimmed profile fields and cleared values", () => {
  assert.deepEqual(validateProfileUpdate({
    displayName: "  Jordan Lee  ",
    pronouns: "  she/her  ",
    aboutMe: "  Walks at dawn.\nKeeps it simple.  ",
    favoriteActivities: ["Walk", "Mobility"],
  }), {
    displayName: "Jordan Lee",
    pronouns: "she/her",
    aboutMe: "Walks at dawn.\nKeeps it simple.",
    favoriteActivities: ["Walk", "Mobility"],
  });
  assert.deepEqual(validateProfileUpdate(blank), {
    displayName: null,
    pronouns: null,
    aboutMe: null,
    favoriteActivities: [],
  });
  assert.equal(validateProfileUpdate({ ...blank, displayName: "a".repeat(80) }).displayName.length, 80);
  assert.equal(validateProfileUpdate({ ...blank, pronouns: "a".repeat(40) }).pronouns.length, 40);
  assert.equal(validateProfileUpdate({ ...blank, aboutMe: "a".repeat(280) }).aboutMe.length, 280);
});

test("rejects invalid profile fields together", () => {
  const result = validateProfileUpdate({
    displayName: "a".repeat(81),
    pronouns: 12,
    aboutMe: "b".repeat(281),
    favoriteActivities: ["Walk", "Walk"],
  });
  assert.equal(result.errors.displayName, "Keep your display name to 80 characters or fewer.");
  assert.equal(result.errors.pronouns, "Enter pronouns as text.");
  assert.equal(result.errors.aboutMe, "Keep your about me to 280 characters or fewer.");
  assert.equal(result.errors.favoriteActivities, "Choose activities from the list.");
  assert.equal(
    validateProfileUpdate({ ...blank, favoriteActivities: ["Swim"] }).errors.favoriteActivities,
    "Choose activities from the list.",
  );
  assert.equal(validateProfileUpdate(undefined).errors.displayName, "Enter a display name.");
});
