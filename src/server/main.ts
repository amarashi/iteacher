/**
 * Entry point: resolve how the root is chosen, start the server, print the URL.
 *
 * Root resolution (the shell decision, #3 — a visible, user-controlled folder):
 *   1. `--root <dir>` / first positional argument   ─┐ overrides: force a root,
 *   2. `ITEACHER_ROOT` environment variable          ─┘ skip the welcome screen.
 *   3. a previously persisted root in the app config  → straight to the dashboard.
 *   4. neither → first-run (#10): serve the welcome screen naming a proposed
 *      default; the learner confirms, and only then is the folder created + saved.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createApp } from "./app.js";

/** A `--root` / positional / `ITEACHER_ROOT` override, or null if none was given. */
function overrideRoot(argv: string[], env: NodeJS.ProcessEnv): string | null {
  const flagIndex = argv.indexOf("--root");
  if (flagIndex !== -1 && argv[flagIndex + 1]) return resolve(argv[flagIndex + 1]!);
  const positional = argv.find((a) => !a.startsWith("-"));
  if (positional) return resolve(positional);
  if (env.ITEACHER_ROOT) return resolve(env.ITEACHER_ROOT);
  return null;
}

/** The proposed default root + the sync folder it sits in, if one is detected. */
function resolveDefault(env: NodeJS.ProcessEnv, home: string): { defaultRoot: string; syncFolder: string | null } {
  const icloud = join(home, "Library", "Mobile Documents", "com~apple~CloudDocs");
  if (existsSync(icloud)) return { defaultRoot: join(icloud, "iTeacher"), syncFolder: "iCloud Drive" };
  if (env.OneDrive && existsSync(env.OneDrive)) return { defaultRoot: join(env.OneDrive, "iTeacher"), syncFolder: "OneDrive" };
  return { defaultRoot: join(home, "iTeacher"), syncFolder: null };
}

/** Where the confirmed root is persisted. Honours an explicit `ITEACHER_CONFIG`. */
function resolveConfigPath(env: NodeJS.ProcessEnv, home: string): string {
  if (env.ITEACHER_CONFIG) return resolve(env.ITEACHER_CONFIG);
  const base = env.APPDATA ?? env.XDG_CONFIG_HOME ?? join(home, ".config");
  return join(base, "iteacher", "config.json");
}

function main(): void {
  const home = homedir();
  const env = process.env;
  const { defaultRoot, syncFolder } = resolveDefault(env, home);

  const app = createApp({
    configPath: resolveConfigPath(env, home),
    defaultRoot,
    syncFolder,
    override: overrideRoot(process.argv.slice(2), env),
  });

  const port = Number(env.PORT ?? 4173);
  app.listen(port, () => {
    console.log(`iTeacher → http://localhost:${port}`);
  });
}

main();
