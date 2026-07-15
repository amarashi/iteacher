import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig, writeConfig } from "../src/store/config.js";

let dir: string;
let configPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "iteacher-config-"));
  configPath = join(dir, "config.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("config read/write (#10 seam)", () => {
  it("returns null when the config file is absent", () => {
    expect(readConfig(configPath)).toBeNull();
  });

  it("round-trips a persisted root", () => {
    writeConfig(configPath, { root: "/home/amir/iTeacher" });
    expect(readConfig(configPath)).toEqual({ root: "/home/amir/iTeacher" });
  });

  it("creates missing parent directories on write", () => {
    const nested = join(dir, "a", "b", "config.json");
    writeConfig(nested, { root: "/x" });
    expect(existsSync(nested)).toBe(true);
    expect(readConfig(nested)).toEqual({ root: "/x" });
  });

  it("returns null on malformed JSON", () => {
    writeFileSync(configPath, "{ not json");
    expect(readConfig(configPath)).toBeNull();
  });

  it("returns null when root is missing or not a string", () => {
    writeFileSync(configPath, JSON.stringify({ notRoot: 1 }));
    expect(readConfig(configPath)).toBeNull();
    writeFileSync(configPath, JSON.stringify({ root: 42 }));
    expect(readConfig(configPath)).toBeNull();
  });
});
