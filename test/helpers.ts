import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp, type AppOptions } from "../src/server/app.js";

/** A workspace to materialise on disk for a test. */
export interface WorkspaceSpec {
  mission?: string;
  syllabus?: string;
  progress?: string;
  /** Map of lesson filename → HTML body. */
  lessons?: Record<string, string>;
}

/** Create a temp root folder holding the given workspaces. Auto-cleaned via `cleanup`. */
export function makeRoot(workspaces: Record<string, WorkspaceSpec>): {
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "iteacher-test-"));
  for (const [slug, spec] of Object.entries(workspaces)) {
    const dir = join(root, slug);
    mkdirSync(dir, { recursive: true });
    if (spec.mission !== undefined) writeFileSync(join(dir, "MISSION.md"), spec.mission);
    if (spec.syllabus !== undefined) writeFileSync(join(dir, "SYLLABUS.md"), spec.syllabus);
    if (spec.progress !== undefined) writeFileSync(join(dir, "progress.json"), spec.progress);
    if (spec.lessons) {
      const lessonsDir = join(dir, "lessons");
      mkdirSync(lessonsDir, { recursive: true });
      for (const [name, body] of Object.entries(spec.lessons)) {
        writeFileSync(join(lessonsDir, name), body);
      }
    }
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

export function mission(topic: string): string {
  return `# Mission: ${topic}\n\n## Why\nBecause.\n`;
}

/** Start the app on an ephemeral port. Returns its base URL and a close fn. */
export async function startServer(
  config: string | AppOptions,
): Promise<{ base: string; close: () => Promise<void> }> {
  const app = createApp(config);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
