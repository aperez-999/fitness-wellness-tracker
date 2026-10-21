import mongoose from "mongoose";

const CACHE_KEY = Symbol.for("fitnessWellnessTracker.mongoose");

function connectionCache() {
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = { promise: null };
  }
  return globalThis[CACHE_KEY];
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const cache = connectionCache();
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { maxPoolSize: 10 })
      .then((connection) => {
        console.log("Connected to MongoDB");
        return connection;
      })
      .catch((error) => {
        cache.promise = null;
        throw error;
      });
  }

  return cache.promise;
}
