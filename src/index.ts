import { buildResume } from "./builder";
import { startDevServer } from "./server";

const isDev =
  process.argv.includes("--dev") || process.argv.includes("--serve");

if (isDev) {
  await startDevServer();
} else {
  await buildResume();
}
