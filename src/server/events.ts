/**
 * Live dashboard updates via Server-Sent Events + `fs.watch` (issue #12).
 *
 * The one new server capability: the dashboard is otherwise request/response,
 * so a topic or lesson that Claude Code authors alongside — a new `MISSION.md`,
 * a new lesson, a `progress.json` write — only shows up on a manual reload. This
 * watches the root and pushes a notification over `GET /api/events` so an open
 * dashboard can re-fetch and swap in the fresh state on its own.
 *
 * The payload is deliberately a bare signal ("something under the root changed")
 * — the client re-derives the whole model from the server, so there is nothing
 * to diff or reconcile here.
 *
 * Lifecycle: the `fs.watch` handle is opened lazily on the first subscriber and
 * closed when the last one disconnects, so a server with no open dashboard
 * watches nothing (and tests release the watcher simply by dropping their
 * client). Rapid bursts of fs events — a directory create quickly followed by
 * its files — are debounced into a single notification.
 */

import { watch, type FSWatcher } from "node:fs";
import type { Request, Response } from "express";

const DEBOUNCE_MS = 120;
const HEARTBEAT_MS = 25_000;

/**
 * Build the `GET /api/events` handler over a live-read root. `getRoot` is read
 * on every connection so a root confirmed at runtime (first-run, #10) is picked
 * up without rebuilding the app. The watcher and its timers are owned entirely
 * by the connection lifecycle below — nothing to tear down from the outside.
 */
export function createEventStream(getRoot: () => string | null): (req: Request, res: Response) => void {
  const clients = new Set<Response>();
  let watcher: FSWatcher | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  function broadcast(): void {
    for (const res of clients) res.write("event: change\ndata: {}\n\n");
  }

  function onFsEvent(): void {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      debounce = null;
      broadcast();
    }, DEBOUNCE_MS);
    debounce.unref();
  }

  function startWatching(): void {
    const root = getRoot();
    if (!root || watcher) return;
    try {
      // `recursive` covers nested workspace files (lessons/, progress.json); it
      // is supported on this app's targets (Windows, macOS, Node ≥20 Linux).
      // `persistent: false` keeps the watch from holding the event loop open on
      // its own — the HTTP server is what keeps the process alive.
      watcher = watch(root, { recursive: true, persistent: false }, onFsEvent);
      // A transient watch error (a file vanishing mid-scan) must not crash the app.
      watcher.on("error", () => {});
    } catch {
      watcher = null;
    }
  }

  function stopWatching(): void {
    watcher?.close();
    watcher = null;
    if (debounce) {
      clearTimeout(debounce);
      debounce = null;
    }
  }

  function handler(req: Request, res: Response): void {
    if (!getRoot()) {
      res.status(404).json({ error: "no root selected" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Defeat proxy buffering so events are delivered as they are written.
      "X-Accel-Buffering": "no",
    });
    // Advise the browser's built-in reconnect backoff, then open the stream.
    res.write("retry: 3000\n: connected\n\n");

    clients.add(res);
    startWatching();

    // Keep intermediaries from dropping an idle connection; unref'd so it never
    // holds the process open by itself.
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
    heartbeat.unref();

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) stopWatching();
      res.end();
    });
  }

  return handler;
}
