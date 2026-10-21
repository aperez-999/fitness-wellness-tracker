import { pathToFileURL } from "node:url";

import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = process.env.PORT || 5000;
const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await connectDB();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}
