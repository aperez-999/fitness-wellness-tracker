// Optional development database using the MongoDB binary from the test tools.
// Unlike the test suites, this process keeps its data across restarts.
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MongoBinary } from "mongodb-memory-server";

const dataPath = fileURLToPath(new URL("../backend/.local-data/mongodb/", import.meta.url));
const logPath = fileURLToPath(new URL("../backend/.local-data/mongodb.log", import.meta.url));
await mkdir(dataPath, { recursive: true });
const binary = await MongoBinary.getPath();
console.log(`Starting MongoDB on 127.0.0.1:27017. Data: ${dataPath}`);
console.log(`MongoDB log: ${logPath}`);
const mongo = spawn(binary, [
  "--dbpath", dataPath,
  "--bind_ip", "127.0.0.1",
  "--port", "27017",
  "--logpath", logPath,
  "--logappend",
], { stdio: "inherit" });
mongo.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
mongo.on("exit", (code) => {
  process.exitCode = code ?? 0;
  if (code) console.error("MongoDB stopped. Check the log above; another database may already be using port 27017.");
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => mongo.kill(signal));
}
