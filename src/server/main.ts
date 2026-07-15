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
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { openBrowser } from "./launch.js";

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
  const url = `http://localhost:${port}`;
  // The double-click launcher (#11) passes `--open` so the learner never touches
  // a browser bar; dev (`pnpm dev`) omits it and just prints the URL.
  const open = process.argv.includes("--open") || isTruthy(env.ITEACHER_OPEN);

  const server = app.listen(port, () => {
    console.log(`iTeacher → ${url}`);
    if (open) openBrowser(url);
  });

  // Without an `error` listener, a failed `listen` (most often EADDRINUSE when a
  // port is already taken) is escalated to an uncaught exception that kills the
  // process instantly — for the double-click learner that's a console window
  // that flashes and vanishes with no explanation (#11). A busy 4173 almost
  // always means iTeacher is already running, so point the browser at the
  // existing instance and exit cleanly rather than crash.
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.log(`iTeacher is already running → ${url}`);
      if (open) openBrowser(url);
      process.exit(0);
    }
    console.error(`iTeacher could not start: ${err.message}`);
    process.exit(1);
  });

  installGracefulShutdown(server);
}

/** Treat "1"/"true"/"yes" (any case) as on; everything else, including unset, as off. */
function isTruthy(value: string | undefined): boolean {
  return value !== undefined && ["1", "true", "yes"].includes(value.trim().toLowerCase());
}

/**
 * Close the server on Ctrl-C / terminal-close so a launched app exits cleanly
 * instead of being killed mid-request (#11: closing is graceful). `server.close`
 * stops accepting connections and lets in-flight ones drain before we exit.
 *
 * SIGHUP is included because closing the launcher's terminal window (the
 * double-click learner's natural "quit") sends it on macOS/Linux.
 */
function installGracefulShutdown(server: Server): void {
  let closing = false;
  const shutdown = () => {
    if (closing) return; // a second signal shouldn't re-enter
    closing = true;
    server.close(() => process.exit(0));
    // A dashboard's live SSE stream (#12) is a long-lived connection that never
    // drains on its own, so `close`'s callback may never fire — force-exit after
    // a short grace period so closing can't hang. `unref` keeps this timer from
    // holding the process open when close *does* drain first.
    setTimeout(() => process.exit(0), 500).unref();
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, shutdown);
}

main();
