import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { BRIDGE_SOURCE } from "../src/server/bridge.js";
import { deriveDashboard } from "../src/store/index.js";
import { makeRoot, mission, startServer } from "./helpers.js";

/**
 * Exercises the real browser-side runtime: the bridge source runs inside a
 * fresh JSDOM window per test (one window = one page load, matching how the
 * browser scopes it), we fire the lesson lifecycle events it listens for,
 * capture the beacons it emits, and prove they (a) carry the right facts and
 * (b) move the derived dashboard once POSTed to the server. This is #6 end to end.
 */

interface Loaded {
  window: JSDOM["window"];
  beacons: () => Promise<Array<Record<string, unknown>>>;
}

function loadBridge(opts: { topic?: string; lesson?: string }): Loaded {
  const meta =
    opts.topic && opts.lesson
      ? `<meta name="iteacher-lesson" data-topic="${opts.topic}" data-lesson="${opts.lesson}">`
      : "";
  const dom = new JSDOM(
    `<!doctype html><html><head>${meta}</head>` +
      `<body><div data-exercise-id="quiz-1"><span id="widget">q</span></div></body></html>`,
    { runScripts: "outside-only" },
  );
  const { window } = dom;
  const captured: string[] = [];
  Object.defineProperty(window.navigator, "sendBeacon", {
    configurable: true,
    value: (_url: string, data: { text(): Promise<string> }) => {
      void data.text().then((t) => captured.push(t));
      return true;
    },
  });
  window.eval(BRIDGE_SOURCE);
  return {
    window,
    beacons: async () => {
      await Promise.resolve();
      await Promise.resolve();
      return captured.map((c) => JSON.parse(c));
    },
  };
}

function fireExercise(window: JSDOM["window"], detail: unknown): void {
  window.document
    .getElementById("widget")!
    .dispatchEvent(new window.CustomEvent("iteacher:exercise", { bubbles: true, detail }));
}

describe("bridge event wiring (#6)", () => {
  it("emits lesson-opened on load, tagged with topic and lesson", async () => {
    const { beacons } = loadBridge({ topic: "rust", lesson: "01-ownership.html" });
    expect(await beacons()).toContainEqual({
      type: "lesson-opened",
      topic: "rust",
      lesson: "01-ownership.html",
    });
  });

  it("joins an iteacher:exercise event to its nearest data-exercise-id", async () => {
    const { window, beacons } = loadBridge({ topic: "rust", lesson: "01-ownership.html" });
    fireExercise(window, { status: "passed", score: 0.9 });
    expect(await beacons()).toContainEqual({
      type: "exercise",
      exerciseId: "quiz-1",
      status: "passed",
      score: 0.9,
      topic: "rust",
      lesson: "01-ownership.html",
    });
  });

  it("marks an exercise dispatched without a passed status as merely attempted", async () => {
    const { window, beacons } = loadBridge({ topic: "rust", lesson: "01-ownership.html" });
    fireExercise(window, { status: "attempted" });
    const ex = (await beacons()).find((b) => b.type === "exercise")!;
    expect(ex.status).toBe("attempted");
    expect(ex.score).toBeUndefined();
  });

  it("emits lesson-completed from window.iteacher.complete()", async () => {
    const { window, beacons } = loadBridge({ topic: "rust", lesson: "01-ownership.html" });
    (window as unknown as { iteacher: { complete(): void } }).iteacher.complete();
    expect(await beacons()).toContainEqual({
      type: "lesson-completed",
      topic: "rust",
      lesson: "01-ownership.html",
    });
  });

  it("emits lesson-completed from a self-completing iteacher:lesson event", async () => {
    const { window, beacons } = loadBridge({ topic: "rust", lesson: "01-ownership.html" });
    window.document.dispatchEvent(
      new window.CustomEvent("iteacher:lesson", { detail: { status: "completed" } }),
    );
    expect(await beacons()).toContainEqual({
      type: "lesson-completed",
      topic: "rust",
      lesson: "01-ownership.html",
    });
  });

  it("stays a silent no-op when the page has no iteacher-lesson meta", async () => {
    const { window, beacons } = loadBridge({});
    fireExercise(window, { status: "passed" });
    expect(await beacons()).toEqual([]);
  });
});

describe("bridge → server → derived dashboard (full runtime)", () => {
  let base: string;
  let root: string;
  let cleanup: () => void;
  let closeServer: () => Promise<void>;

  beforeEach(async () => {
    const made = makeRoot({
      rust: { mission: mission("Rust"), lessons: { "01-ownership.html": "<p/>" } },
    });
    root = made.root;
    cleanup = made.cleanup;
    ({ base, close: closeServer } = await startServer(root));
  });

  afterEach(async () => {
    await closeServer();
    cleanup();
  });

  it("drives a lesson from opened → passed exercise → completed", async () => {
    const { window, beacons } = loadBridge({ topic: "rust", lesson: "01-ownership.html" });
    fireExercise(window, { status: "passed" });
    (window as unknown as { iteacher: { complete(): void } }).iteacher.complete();

    // Replay the captured beacons through the real endpoint, in order.
    for (const event of await beacons()) {
      const res = await fetch(`${base}/api/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      });
      expect(res.status).toBe(204);
    }

    const t = deriveDashboard(root).topics[0]!;
    expect(t.lessonsCompleted).toBe(1);
    expect(t.homeworksDone).toBe(1);
    expect(t.lessons[0]!.state).toBe("completed");
  });
});
