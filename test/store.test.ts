import { describe, it, expect, afterEach } from "vitest";
import { deriveDashboard, recordCompletion } from "../src/store/index.js";
import { makeRoot, mission, type WorkspaceSpec } from "./helpers.js";

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((c) => c());
  cleanups = [];
});

function root(workspaces: Record<string, WorkspaceSpec>) {
  const { root, cleanup } = makeRoot(workspaces);
  cleanups.push(cleanup);
  return root;
}

const SYLLABUS = `# Syllabus: Rust

1. **Ownership** — who owns what. [authored: 01-ownership.html]
2. **Borrowing** — lending without giving. [authored: 02-borrowing.html]
3. **Lifetimes** — how long a reference lives. [planned]
4. **Traits** — shared behaviour. [planned]
`;

describe("deriveDashboard", () => {
  it("names a topic from its mission heading", () => {
    const r = root({ rust: { mission: mission("Rust Systems Programming") } });
    const model = deriveDashboard(r);
    expect(model.topics).toHaveLength(1);
    expect(model.topics[0]!.title).toBe("Rust Systems Programming");
    expect(model.topics[0]!.slug).toBe("rust");
  });

  it("falls back to the folder name when the mission has no title heading", () => {
    const r = root({ half_setup: { mission: "## Why\nno heading yet\n" } });
    expect(deriveDashboard(r).topics[0]!.title).toBe("half_setup");
  });

  it("only counts folders that contain a MISSION.md as topics", () => {
    const r = root({
      rust: { mission: mission("Rust") },
      not_a_topic: { lessons: { "x.html": "<p>orphan</p>" } },
    });
    const model = deriveDashboard(r);
    expect(model.topics.map((t) => t.slug)).toEqual(["rust"]);
  });

  it("counts authored lessons on disk", () => {
    const r = root({
      rust: {
        mission: mission("Rust"),
        lessons: { "01-a.html": "<p>a</p>", "02-b.html": "<p>b</p>", "notes.txt": "x" as never },
      },
    });
    // notes.txt is not .html, so it does not count.
    expect(deriveDashboard(r).topics[0]!.lessonsAuthored).toBe(2);
  });

  it("counts a lesson on disk that the syllabus has not caught up to", () => {
    const r = root({
      rust: {
        mission: mission("Rust"),
        syllabus: SYLLABUS,
        lessons: {
          "01-ownership.html": "<p/>",
          "02-borrowing.html": "<p/>",
          "03-surprise.html": "<p>authored ahead of the forecast</p>",
        },
      },
    });
    expect(deriveDashboard(r).topics[0]!.lessonsAuthored).toBe(3);
  });

  it("derives next-up and future titles from the first planned syllabus entries", () => {
    const r = root({
      rust: {
        mission: mission("Rust"),
        syllabus: SYLLABUS,
        lessons: { "01-ownership.html": "<p/>", "02-borrowing.html": "<p/>" },
      },
    });
    const t = deriveDashboard(r).topics[0]!;
    expect(t.nextUp).toBe("Lifetimes");
    expect(t.futureTitles).toEqual(["Traits"]);
  });

  it("renders a brand-new topic (mission only) without a syllabus or progress", () => {
    const r = root({ fresh: { mission: mission("Fresh Topic") } });
    const t = deriveDashboard(r).topics[0]!;
    expect(t.lessonsAuthored).toBe(0);
    expect(t.lessonsCompleted).toBe(0);
    expect(t.homeworksDone).toBe(0);
    expect(t.nextUp).toBeNull();
    expect(t.futureTitles).toEqual([]);
    expect(t.state).toBe("not-started");
  });

  it("shows zero completed for a topic with no progress file", () => {
    const r = root({
      rust: { mission: mission("Rust"), lessons: { "01-ownership.html": "<p/>" } },
    });
    const t = deriveDashboard(r).topics[0]!;
    expect(t.lessonsCompleted).toBe(0);
    expect(t.lessons[0]!.state).toBe("not-started");
  });

  it("computes each topic's counts independently", () => {
    const r = root({
      rust: { mission: mission("Rust"), lessons: { "01.html": "<p/>" } },
      go: { mission: mission("Go"), lessons: { "01.html": "<p/>", "02.html": "<p/>" } },
    });
    const model = deriveDashboard(r);
    const rust = model.topics.find((t) => t.slug === "rust")!;
    const go = model.topics.find((t) => t.slug === "go")!;
    expect(rust.lessonsAuthored).toBe(1);
    expect(go.lessonsAuthored).toBe(2);
  });

  it("flags the soft-journey position as approximate against the arc total", () => {
    const r = root({
      rust: {
        mission: mission("Rust"),
        syllabus: SYLLABUS,
        lessons: { "01-ownership.html": "<p/>", "02-borrowing.html": "<p/>" },
      },
    });
    const t = deriveDashboard(r).topics[0]!;
    expect(t.journey.approximate).toBe(true);
    expect(t.journey.plannedTotal).toBe(4); // four syllabus entries
  });

  it("reports no last-activity for a topic with no recorded progress", () => {
    const r = root({ rust: { mission: mission("Rust"), lessons: { "01-a.html": "<p/>" } } });
    expect(deriveDashboard(r).topics[0]!.lastActivityAt).toBeNull();
  });

  it("derives lastActivityAt as the most recent timestamp across lesson and exercise facts", () => {
    const progress = JSON.stringify({
      version: 1,
      lessons: {
        "01-ownership.html": {
          state: "completed",
          openedAt: "2026-01-01T10:00:00.000Z",
          completedAt: "2026-01-01T10:30:00.000Z",
        },
      },
      exercises: {
        "01-ownership.html": {
          "quiz-1": { status: "passed", firstSeenAt: "2026-01-01T10:15:00.000Z", updatedAt: "2026-01-02T09:00:00.000Z" },
        },
      },
    });
    const r = root({
      rust: { mission: mission("Rust"), lessons: { "01-ownership.html": "<p/>" }, progress },
    });
    // The exercise's updatedAt (Jan 2) is later than any lesson timestamp (Jan 1).
    expect(deriveDashboard(r).topics[0]!.lastActivityAt).toBe("2026-01-02T09:00:00.000Z");
  });

  it("titles authored lesson beads from the syllabus, others from the filename", () => {
    const r = root({
      rust: {
        mission: mission("Rust"),
        syllabus: SYLLABUS,
        lessons: { "01-ownership.html": "<p/>", "99-extra-notes.html": "<p/>" },
      },
    });
    const beads = deriveDashboard(r).topics[0]!.lessons;
    expect(beads.find((b) => b.file === "01-ownership.html")!.title).toBe("Ownership");
    expect(beads.find((b) => b.file === "99-extra-notes.html")!.title).toBe("Extra Notes");
  });
});

describe("recordCompletion → derive round-trip", () => {
  const workspace = (): string =>
    root({
      rust: {
        mission: mission("Rust"),
        syllabus: SYLLABUS,
        lessons: { "01-ownership.html": "<p/>", "02-borrowing.html": "<p/>" },
      },
    });

  it("moves a lesson to in-progress when opened", () => {
    const r = workspace();
    recordCompletion(`${r}/rust`, { type: "lesson-opened", lesson: "01-ownership.html" });
    const t = deriveDashboard(r).topics[0]!;
    expect(t.lessons.find((l) => l.file === "01-ownership.html")!.state).toBe("in-progress");
    expect(t.state).toBe("in-progress");
  });

  it("moves the completed count when a lesson is completed", () => {
    const r = workspace();
    recordCompletion(`${r}/rust`, { type: "lesson-completed", lesson: "01-ownership.html" });
    expect(deriveDashboard(r).topics[0]!.lessonsCompleted).toBe(1);
  });

  it("counts a passed exercise toward homeworks-done", () => {
    const r = workspace();
    recordCompletion(`${r}/rust`, {
      type: "exercise",
      lesson: "01-ownership.html",
      exerciseId: "quiz-1",
      status: "passed",
      score: 0.9,
    });
    expect(deriveDashboard(r).topics[0]!.homeworksDone).toBe(1);
  });

  it("does not count a merely-attempted exercise as homework done", () => {
    const r = workspace();
    recordCompletion(`${r}/rust`, {
      type: "exercise",
      lesson: "01-ownership.html",
      exerciseId: "quiz-1",
      status: "attempted",
    });
    expect(deriveDashboard(r).topics[0]!.homeworksDone).toBe(0);
  });

  it("never downgrades a passed exercise back to attempted", () => {
    const r = workspace();
    const ws = `${r}/rust`;
    recordCompletion(ws, { type: "exercise", lesson: "01-ownership.html", exerciseId: "q", status: "passed" });
    recordCompletion(ws, { type: "exercise", lesson: "01-ownership.html", exerciseId: "q", status: "attempted" });
    expect(deriveDashboard(r).topics[0]!.homeworksDone).toBe(1);
  });

  it("never downgrades a completed lesson when it is re-opened", () => {
    const r = workspace();
    const ws = `${r}/rust`;
    recordCompletion(ws, { type: "lesson-completed", lesson: "01-ownership.html" });
    recordCompletion(ws, { type: "lesson-opened", lesson: "01-ownership.html" });
    expect(deriveDashboard(r).topics[0]!.lessonsCompleted).toBe(1);
  });

  it("is idempotent: recording the same completion twice counts once", () => {
    const r = workspace();
    const ws = `${r}/rust`;
    recordCompletion(ws, { type: "lesson-completed", lesson: "01-ownership.html" });
    recordCompletion(ws, { type: "lesson-completed", lesson: "01-ownership.html" });
    expect(deriveDashboard(r).topics[0]!.lessonsCompleted).toBe(1);
  });

  it("creates progress.json on first write for a topic that had none", () => {
    const r = root({ rust: { mission: mission("Rust"), lessons: { "01-ownership.html": "<p/>" } } });
    recordCompletion(`${r}/rust`, { type: "lesson-completed", lesson: "01-ownership.html" });
    expect(deriveDashboard(r).topics[0]!.lessonsCompleted).toBe(1);
  });
});
