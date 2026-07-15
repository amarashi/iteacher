import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { deriveDashboard } from "../src/store/index.js";
import { makeRoot, mission, startServer } from "./helpers.js";

const LESSON_HTML = `<!doctype html><html><head><title>Ownership</title></head>
<body><h1>Ownership</h1>
<div data-exercise-id="quiz-1"><button>answer</button></div>
</body></html>`;

let base: string;
let root: string;
let cleanup: () => void;
let closeServer: () => Promise<void>;

beforeEach(async () => {
  const made = makeRoot({
    rust: {
      mission: mission("Rust"),
      syllabus: "1. **Ownership** — who owns what. [authored: 01-ownership.html]\n2. **Borrowing** — later. [planned]\n",
      lessons: { "01-ownership.html": LESSON_HTML },
    },
  });
  root = made.root;
  cleanup = made.cleanup;
  ({ base, close: closeServer } = await startServer(root));
});

afterEach(async () => {
  await closeServer();
  cleanup();
});

async function post(body: unknown): Promise<Response> {
  return fetch(`${base}/api/progress`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("render surface (#5)", () => {
  it("serves the runtime bridge script", async () => {
    const res = await fetch(`${base}/_iteacher/bridge.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
    expect(await res.text()).toContain("iteacher:exercise");
  });

  it("injects the lesson meta, bridge, and top bar into a served lesson", async () => {
    const html = await (await fetch(`${base}/w/rust/lessons/01-ownership.html`)).text();
    expect(html).toContain('name="iteacher-lesson"');
    expect(html).toContain('data-topic="rust"');
    expect(html).toContain('data-lesson="01-ownership.html"');
    expect(html).toContain("/_iteacher/bridge.js");
    expect(html).toContain("iteacher-bar");
    expect(html).toContain("← Dashboard");
    // The learner's own markup is preserved untouched.
    expect(html).toContain('data-exercise-id="quiz-1"');
  });

  it("does not inject the runtime meta into non-lesson files", async () => {
    // MISSION.md is served verbatim (not a lesson, not even HTML).
    const res = await fetch(`${base}/w/rust/MISSION.md`);
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("iteacher-lesson");
  });

  it("rejects path traversal out of the workspace", async () => {
    const res = await fetch(`${base}/w/rust/..%2f..%2fpackage.json`);
    expect([400, 404]).toContain(res.status);
  });

  it("404s an unknown topic", async () => {
    expect((await fetch(`${base}/w/nope/lessons/x.html`)).status).toBe(404);
  });

  it("renders the dashboard with the topic and its lesson link", async () => {
    const html = await (await fetch(`${base}/`)).text();
    expect(html).toContain("Rust");
    expect(html).toContain("/w/rust/lessons/01-ownership.html");
  });

  it("injects a forward-nav link to the next lesson in teaching order (#5)", async () => {
    const { root, cleanup } = makeRoot({
      rust: {
        mission: mission("Rust"),
        lessons: { "01-a.html": "<p/>", "02-b.html": "<p/>" },
      },
    });
    const srv = await startServer(root);
    try {
      const first = await (await fetch(`${srv.base}/w/rust/lessons/01-a.html`)).text();
      expect(first).toContain('href="/w/rust/lessons/02-b.html"');
      expect(first).toContain("Next →");
      // The last lesson has no next link (the arrow text appears only in the anchor).
      const last = await (await fetch(`${srv.base}/w/rust/lessons/02-b.html`)).text();
      expect(last).not.toContain("Next →");
      expect(last).not.toContain('class="iteacher-bar__next"');
    } finally {
      await srv.close();
      cleanup();
    }
  });
});

describe("runtime endpoint (#6) → recordCompletion round-trip", () => {
  it("records lesson-opened as in-progress", async () => {
    const res = await post({ topic: "rust", lesson: "01-ownership.html", type: "lesson-opened" });
    expect(res.status).toBe(204);
    const t = deriveDashboard(root).topics[0]!;
    expect(t.lessons[0]!.state).toBe("in-progress");
  });

  it("records lesson-completed as completed", async () => {
    await post({ topic: "rust", lesson: "01-ownership.html", type: "lesson-completed" });
    expect(deriveDashboard(root).topics[0]!.lessonsCompleted).toBe(1);
  });

  it("records a passed exercise with a score toward homeworks-done", async () => {
    await post({
      topic: "rust",
      lesson: "01-ownership.html",
      type: "exercise",
      exerciseId: "quiz-1",
      status: "passed",
      score: 0.8,
    });
    expect(deriveDashboard(root).topics[0]!.homeworksDone).toBe(1);
  });

  it("rejects a write to an unknown topic", async () => {
    const res = await post({ topic: "ghost", lesson: "x.html", type: "lesson-opened" });
    expect(res.status).toBe(404);
  });

  it("rejects a malformed event", async () => {
    const res = await post({ topic: "rust", lesson: "01-ownership.html", type: "bogus" });
    expect(res.status).toBe(400);
  });

  it("rejects a lesson name that is not a plain filename", async () => {
    const res = await post({ topic: "rust", lesson: "../escape.html", type: "lesson-opened" });
    expect(res.status).toBe(400);
  });
});
