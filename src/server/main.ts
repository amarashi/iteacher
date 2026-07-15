/**
 * Entry point: resolve the workspace root, start the server, print the URL.
 *
 * Root resolution (the shell decision, #3 — a visible, user-controlled folder):
 *   1. `--root <dir>` / first positional argument
 *   2. `ITEACHER_ROOT` environment variable
 *   3. `~/iTeacher` (created on first run if absent)
 */

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createApp } from "./app.js";

function resolveRoot(argv: string[], env: NodeJS.ProcessEnv): string {
  const flagIndex = argv.indexOf("--root");
  if (flagIndex !== -1 && argv[flagIndex + 1]) return resolve(argv[flagIndex + 1]!);
  const positional = argv.find((a) => !a.startsWith("-"));
  if (positional) return resolve(positional);
  if (env.ITEACHER_ROOT) return resolve(env.ITEACHER_ROOT);
  return join(homedir(), "iTeacher");
}

function main(): void {
  const root = resolveRoot(process.argv.slice(2), process.env);
  mkdirSync(root, { recursive: true });

  const port = Number(process.env.PORT ?? 4173);
  const app = createApp(root);
  app.listen(port, () => {
    console.log(`iTeacher serving ${root}`);
    console.log(`  → http://localhost:${port}`);
  });
}

main();
