import { describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeRoot, mission, startServer } from "./helpers.js";

/**
 * Live dashboard updates (#12): the server watches the root and pushes a
 * Server-Sent Events notification when the workspaces on disk change, so an
 * open dashboard can re-fetch without a manual reload. Driven at the HTTP seam:
 * connect a client to `/api/events`, mutate the root, assert the client is
 * notified.
 *
 * The client here is a plain `fetch` streaming reader rather than `EventSource`
 * (not a Node global in this runtime) — it consumes the same `text/event-stream`.
 */
function subscribe(base: string): {
  /** Resolves once the connection is open (headers received, watcher started). */
  opened: Promise<void>;
  /** Resolves on the first `change` event, rejects on timeout/stream end. */
  change: (timeoutMs?: number) => Promise<void>;
  close: () => void;
} {
  const ctrl = new AbortController();
  let onOpen!: () => void;
  const opened = new Promise<void>((r) => (onOpen = r));

  const streamed = fetch(`${base}/api/events`, {
    signal: ctrl.signal,
    headers: { accept: "text/event-stream" },
  }).then((res) => {
    onOpen();
    return res.body!.getReader();
  });

  const change = (timeoutMs = 5000) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no change event within timeout")), timeoutMs);
      streamed
        .then(async (reader) => {
          const decoder = new TextDecoder();
          let buf = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) throw new Error("stream ended before a change event");
            buf += decoder.decode(value, { stream: true });
            if (/(^|\n)event:\s*change/.test(buf)) {
              clearTimeout(timer);
              resolve();
              return;
            }
          }
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });

  return { opened, change, close: () => ctrl.abort() };
}

describe("live dashboard updates (#12) — SSE + fs.watch", () => {
  it("notifies an open client when a new workspace appears on disk", async () => {
    const { root, cleanup } = makeRoot({ rust: { mission: mission("Rust") } });
    const { base, close } = await startServer(root);
    const client = subscribe(base);
    try {
      const changed = client.change();
      await client.opened;
      const dir = join(root, "go");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "MISSION.md"), mission("Go"));
      await expect(changed).resolves.toBeUndefined();
    } finally {
      client.close();
      await close();
      cleanup();
    }
  });

  it("notifies an open client when a progress.json write lands", async () => {
    const { root, cleanup } = makeRoot({ rust: { mission: mission("Rust") } });
    const { base, close } = await startServer(root);
    const client = subscribe(base);
    try {
      const changed = client.change();
      await client.opened;
      writeFileSync(join(root, "rust", "progress.json"), JSON.stringify({ lessons: {} }));
      await expect(changed).resolves.toBeUndefined();
    } finally {
      client.close();
      await close();
      cleanup();
    }
  });

  it("refuses the event stream when no root is selected", async () => {
    const defaultRoot = join(mkdtempSync(join(tmpdir(), "iteacher-noroot-")), "iTeacher");
    const { base, close } = await startServer({ configPath: "", defaultRoot });
    try {
      const res = await fetch(`${base}/api/events`);
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });
});
