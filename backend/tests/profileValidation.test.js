import assert from "node:assert/strict";
import test from "node:test";

import { validateProfileUpdate } from "../src/utils/profileValidation.js";

test("accepts a trimmed display name and a cleared name", () => {
  assert.deepEqual(validateProfileUpdate({ displayName: "  Jordan Lee  " }), {
    displayName: "Jordan Lee",
  });
  assert.deepEqual(validateProfileUpdate({ displayName: "   " }), {
    displayName: null,
  });
  assert.deepEqual(validateProfileUpdate({ displayName: "" }), {
    displayName: null,
  });
});

test("rejects missing, non-string, and overlong display names", () => {
  for (const body of [undefined, {}, { displayName: 12 }, { displayName: null }]) {
    assert.equal(
      validateProfileUpdate(body).errors.displayName,
      "Enter a display name.",
    );
  }
  assert.equal(
    validateProfileUpdate({ displayName: "a".repeat(81) }).errors.displayName,
    "Keep your display name to 80 characters or fewer.",
  );
  assert.equal(validateProfileUpdate({ displayName: "a".repeat(80) }).displayName.length, 80);
});
