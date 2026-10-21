import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";

const CACHE_KEY = Symbol.for("fitnessWellnessTracker.mongoose");

test("connectDB reuses one in-flight connection and retries after a failure", async () => {
  const previousUri = process.env.MONGODB_URI;
  const originalConnect = mongoose.connect;
  delete globalThis[CACHE_KEY];
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/unused-deployment-cache";

  let calls = 0;
  mongoose.connect = async (_uri, options) => {
    assert.deepEqual(options, { maxPoolSize: 10 });
    calls += 1;
    if (calls === 1) {
      throw new Error("first attempt failed");
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
    return mongoose;
  };

  try {
    await assert.rejects(
      () => import("../src/config/db.js").then(({ connectDB }) => connectDB()),
      /first attempt failed/,
    );

    const { connectDB } = await import("../src/config/db.js");
    delete globalThis[CACHE_KEY];
    const first = connectDB();
    const second = connectDB();
    const [left, right] = await Promise.all([first, second]);
    assert.equal(calls, 2);
    assert.equal(left, right);
  } finally {
    mongoose.connect = originalConnect;
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
    delete globalThis[CACHE_KEY];
  }
});

test("connectDB refuses to open a connection without MONGODB_URI", async () => {
  const previousUri = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  delete globalThis[CACHE_KEY];
  const { connectDB } = await import("../src/config/db.js");
  await assert.rejects(connectDB(), /MONGODB_URI is not set/);
  if (previousUri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = previousUri;
});
