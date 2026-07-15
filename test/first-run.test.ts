import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig } from "../src/store/config.js";
import { startServer } from "./helpers.js";

let dir: string;
let configPath: string;
let defaultRoot: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "iteacher-firstrun-"));
  configPath = join(dir, "cfg", "config.json");
  defaultRoot = join(dir, "iTeacher");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

async function serve(opts: {
  configPath: string;
  defaultRoot: string;
  syncFolder?: string | null;
  override?: string | null;
}) {
  return startServer(opts);
}

async function postRoot(base: string, body?: unknown): Promise<Response> {
  return fetch(`${base}/api/root`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

describe("first-run root selection (#10)", () => {
  it("serves the welcome screen when no root is persisted", async () => {
    const { base, close } = await serve({ configPath, defaultRoot, syncFolder: "iCloud Drive" });
    try {
      const html = await (await fetch(`${base}/`)).text();
      expect(html).toContain("Welcome to iTeacher");
      // The resolved absolute path is shown, copyable (terminal-reachable, #3).
      expect(html).toContain(defaultRoot);
      // Sync-folder detection surfaced as a subtitle.
      expect(html).toContain("iCloud Drive");
      // Primary accepts the default; the quiet alternative is offered.
      expect(html).toContain("Start here");
      expect(html).toContain("Choose a different folder");
      // The folder is NOT created until the learner confirms.
      expect(existsSync(defaultRoot)).toBe(false);
    } finally {
      await close();
    }
  });

  it("omits the sync subtitle when no sync folder is detected", async () => {
    const { base, close } = await serve({ configPath, defaultRoot, syncFolder: null });
    try {
      const html = await (await fetch(`${base}/`)).text();
      expect(html).toContain("Welcome to iTeacher");
      expect(html).not.toContain("iCloud Drive");
    } finally {
      await close();
    }
  });

  it("on confirm-default: creates the folder, persists config, then serves the dashboard", async () => {
    const { base, close } = await serve({ configPath, defaultRoot });
    try {
      const res = await postRoot(base);
      expect(res.status).toBe(200);
      expect(existsSync(defaultRoot)).toBe(true);
      expect(readConfig(configPath)).toEqual({ root: defaultRoot });
      // Subsequent GET / is now the dashboard, not the welcome screen.
      const html = await (await fetch(`${base}/`)).text();
      expect(html).not.toContain("Welcome to iTeacher");
      expect(html).toContain("No topics yet");
    } finally {
      await close();
    }
  });

  it("on confirm with an explicit path: persists and creates that folder", async () => {
    const chosen = join(dir, "somewhere", "else");
    const { base, close } = await serve({ configPath, defaultRoot });
    try {
      const res = await postRoot(base, { path: chosen });
      expect(res.status).toBe(200);
      expect(existsSync(chosen)).toBe(true);
      expect(readConfig(configPath)).toEqual({ root: chosen });
    } finally {
      await close();
    }
  });

  it("second launch with a persisted config skips welcome and serves the dashboard", async () => {
    const first = await serve({ configPath, defaultRoot });
    await postRoot(first.base);
    await first.close();

    // A brand-new server over the same config path — the persisted root wins.
    const { base, close } = await serve({ configPath, defaultRoot: join(dir, "unused") });
    try {
      const html = await (await fetch(`${base}/`)).text();
      expect(html).not.toContain("Welcome to iTeacher");
      expect(html).toContain("No topics yet");
    } finally {
      await close();
    }
  });

  it("an override (--root / ITEACHER_ROOT) skips welcome and does not persist config", async () => {
    const overrideRoot = join(dir, "override");
    const { base, close } = await serve({ configPath, defaultRoot, override: overrideRoot });
    try {
      const html = await (await fetch(`${base}/`)).text();
      expect(html).not.toContain("Welcome to iTeacher");
      expect(html).toContain("No topics yet");
      // Overrides are transient — nothing is written to config.
      expect(readConfig(configPath)).toBeNull();
    } finally {
      await close();
    }
  });

  it("rejects a traversal path on the write endpoint and persists nothing", async () => {
    const { base, close } = await serve({ configPath, defaultRoot });
    try {
      const res = await postRoot(base, { path: "../../etc/passwd" });
      expect(res.status).toBe(400);
      expect(readConfig(configPath)).toBeNull();
      // Still first-run.
      expect(await (await fetch(`${base}/`)).text()).toContain("Welcome to iTeacher");
    } finally {
      await close();
    }
  });

  it("rejects an empty-string / non-string path", async () => {
    const { base, close } = await serve({ configPath, defaultRoot });
    try {
      expect((await postRoot(base, { path: "" })).status).toBe(400);
      expect((await postRoot(base, { path: 42 })).status).toBe(400);
      expect(readConfig(configPath)).toBeNull();
    } finally {
      await close();
    }
  });
});
