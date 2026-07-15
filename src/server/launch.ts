/**
 * Opening the system browser at the served URL (the launcher half of #11).
 *
 * The double-click launcher boots the built server; the server, once it is
 * listening, opens the learner's default browser here. Doing it after `listen`
 * (rather than in the OS script) means the browser is only opened once the port
 * is actually accepting connections, so there is no open-before-ready race and
 * the launcher script itself stays a thin `node … --open`.
 *
 * Stays a plain `localhost` web app (the #3 shell decision) — this shells out to
 * the OS URL opener; it is NOT an embedded Electron window (phase-2).
 */

import { spawn as nodeSpawn, type SpawnOptions } from "node:child_process";

/** The minimal shape of `child_process.spawn` this module depends on (injectable for tests). */
type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => { on(event: "error", listener: (err: Error) => void): unknown; unref(): void };

/** The platform command + args that open `url` in the default browser. */
export function browserOpenCommand(
  url: string,
  platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
  switch (platform) {
    case "win32":
      // `start` treats its first quoted arg as a window title, so pass an empty
      // "" title before the URL — otherwise the URL is consumed as the title.
      return { command: "cmd", args: ["/c", "start", "", url] };
    case "darwin":
      return { command: "open", args: [url] };
    default:
      return { command: "xdg-open", args: [url] };
  }
}

/**
 * Open `url` in the system browser, detached so the opener outlives this
 * process. Best-effort: a missing opener is swallowed — the URL is always
 * printed to the console too, so the launcher never hard-fails on this.
 */
export function openBrowser(
  url: string,
  platform: NodeJS.Platform = process.platform,
  spawn: SpawnFn = nodeSpawn as unknown as SpawnFn,
): void {
  const { command, args } = browserOpenCommand(url, platform);
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    // A missing opener (e.g. no `xdg-open`) surfaces as an async `error` event,
    // not a throw — without this listener Node would escalate it to an uncaught
    // exception and crash the just-started server. Swallow it: the URL is printed.
    child.on("error", () => {});
    child.unref();
  } catch {
    // The server is already up; the console URL is the fallback.
  }
}
