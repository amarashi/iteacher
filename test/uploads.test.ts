import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { makeRoot, mission, startServer } from "./helpers.js";

// The learner-upload endpoint (the Critique Loop, ADR-0002): a browser→workspace
// write that lands Artifacts under submissions/ and Exhibits under exhibits/, so
// the tutor can Read them.

let base: string;
let root: string;
let cleanup: () => void;
let closeServer: () => Promise<void>;

beforeEach(async () => {
  const made = makeRoot({
    rust: { mission: mission("Rust"), lessons: { "01-intro.html": "<h1>hi</h1>" } },
  });
  root = made.root;
  cleanup = made.cleanup;
  ({ base, close: closeServer } = await startServer(root));
});

afterEach(async () => {
  await closeServer();
  cleanup();
});

function b64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

async function upload(topic: string, body: unknown): Promise<Response> {
  return fetch(`${base}/api/w/${topic}/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("learner uploads (#critique-loop)", () => {
  it("saves a submission under submissions/ and returns its workspace-relative path", async () => {
    const res = await upload("rust", {
      kind: "submission",
      filename: "my-solution.py",
      dataBase64: b64("print('hi')\n"),
    });
    expect(res.status).toBe(201);
    const { path } = (await res.json()) as { path: string };
    expect(path).toMatch(/^submissions\/.+\.py$/);
    const abs = join(root, "rust", path);
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs, "utf8")).toBe("print('hi')\n");
  });

  it("saves an exhibit under exhibits/", async () => {
    const res = await upload("rust", {
      kind: "exhibit",
      filename: "question.txt",
      dataBase64: b64("what is a borrow?"),
    });
    expect(res.status).toBe(201);
    const { path } = (await res.json()) as { path: string };
    expect(path).toMatch(/^exhibits\/.+\.txt$/);
    expect(existsSync(join(root, "rust", path))).toBe(true);
  });

  it("rejects a type the tutor cannot perceive (audio)", async () => {
    const res = await upload("rust", {
      kind: "submission",
      filename: "take.mp3",
      dataBase64: b64("not really audio"),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unsupported/i);
  });

  it("rejects an unknown kind", async () => {
    const res = await upload("rust", { kind: "sneaky", filename: "x.png", dataBase64: b64("x") });
    expect(res.status).toBe(400);
  });

  it("404s an unknown topic", async () => {
    const res = await upload("nope", { kind: "exhibit", filename: "x.txt", dataBase64: b64("x") });
    expect(res.status).toBe(404);
  });

  it("neutralises a traversal filename — the file stays inside submissions/", async () => {
    const res = await upload("rust", {
      kind: "submission",
      filename: "../../escape.txt",
      dataBase64: b64("nope"),
    });
    expect(res.status).toBe(201);
    const { path } = (await res.json()) as { path: string };
    // The stored name is derived + timestamped; it never climbs out of submissions/.
    expect(path.startsWith("submissions/")).toBe(true);
    expect(path).not.toContain("..");
    const files = readdirSync(join(root, "rust", "submissions"));
    expect(files.length).toBe(1);
    // Nothing was written at the workspace root or above it.
    expect(existsSync(join(root, "escape.txt"))).toBe(false);
  });

  it("rejects a missing payload", async () => {
    const res = await upload("rust", { kind: "submission", filename: "x.txt" });
    expect(res.status).toBe(400);
  });
});
