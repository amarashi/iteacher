/**
 * App config read/write (issue #10) — the persisted workspace root.
 *
 * A tiny pure module over an explicit config path: the first-run flow reads it to
 * decide welcome-vs-dashboard, and writes it the moment the learner confirms a
 * root. Kept separate from the workspace store (which only ever touches files
 * *inside* a workspace) — this is the one place that records *which* root to use.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** The persisted app config. Only the chosen root, for now. */
export interface IteacherConfig {
  /** Absolute path to the workspace root the learner confirmed. */
  root: string;
}

/** Read + validate the config, or null if absent, unreadable, or malformed. */
export function readConfig(configPath: string): IteacherConfig | null {
  let text: string;
  try {
    text = readFileSync(configPath, "utf8");
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(text) as unknown;
    if (!data || typeof data !== "object") return null;
    const root = (data as Record<string, unknown>).root;
    if (typeof root !== "string" || root.length === 0) return null;
    return { root };
  } catch {
    return null;
  }
}

/** Persist the config, creating parent directories as needed. */
export function writeConfig(configPath: string, config: IteacherConfig): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}
