import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { renderDashboard } from "../src/server/dashboard.js";
import type { DashboardModel, TopicModel, LessonBead } from "../src/store/types.js";

/**
 * The journey-rail dashboard (#4) is a pure function DashboardModel → HTML.
 * These tests build models by hand and query the rendered DOM — asserting the
 * information architecture (beads, ghosts, hero, grouping, honest provisionality)
 * rather than exact markup, so the render can be restyled without breaking them.
 */

function bead(file: string, title: string, state: LessonBead["state"]): LessonBead {
  return { file, title, state };
}

function topic(over: Partial<TopicModel> & { slug: string }): TopicModel {
  const lessons = over.lessons ?? [];
  return {
    slug: over.slug,
    dir: `/root/${over.slug}`,
    title: over.title ?? over.slug,
    lessonsAuthored: over.lessonsAuthored ?? lessons.length,
    lessonsCompleted: over.lessonsCompleted ?? lessons.filter((l) => l.state === "completed").length,
    homeworksDone: over.homeworksDone ?? 0,
    nextUp: over.nextUp ?? null,
    futureTitles: over.futureTitles ?? [],
    journey: over.journey ?? { completed: 0, plannedTotal: lessons.length, approximate: false },
    lastActivityAt: over.lastActivityAt ?? null,
    lessons,
    plannedGhosts: over.plannedGhosts ?? [],
    state: over.state ?? "not-started",
  };
}

function dom(model: DashboardModel): Document {
  return new JSDOM(renderDashboard(model)).window.document;
}

function model(topics: TopicModel[], root = "/home/me/iTeacher"): DashboardModel {
  return { root, topics };
}

describe("renderDashboard — journey rails (#4)", () => {
  it("renders one rail per topic, titled", () => {
    const doc = dom(
      model([
        topic({ slug: "rust", title: "Rust", state: "in-progress", lessons: [bead("01.html", "Ownership", "completed")] }),
        topic({ slug: "go", title: "Go", state: "not-started", lessons: [bead("01.html", "Goroutines", "not-started")] }),
      ]),
    );
    const titles = [...doc.querySelectorAll(".rail h3")].map((h) => h.textContent);
    expect(titles.some((t) => t?.includes("Rust"))).toBe(true);
    expect(titles.some((t) => t?.includes("Go"))).toBe(true);
  });

  it("groups topics in the fixed order In progress → Not started → Completed", () => {
    const doc = dom(
      model([
        topic({ slug: "done", title: "Done", state: "completed", lessons: [bead("01.html", "A", "completed")] }),
        topic({ slug: "fresh", title: "Fresh", state: "not-started", lessons: [bead("01.html", "A", "not-started")] }),
        topic({ slug: "active", title: "Active", state: "in-progress", lessons: [bead("01.html", "A", "in-progress")] }),
      ]),
    );
    const groups = [...doc.querySelectorAll(".grouphd")].map((g) => g.textContent?.toLowerCase().trim());
    expect(groups).toEqual(["in progress", "not started", "completed"]);
  });

  it("omits a group heading when that group is empty", () => {
    const doc = dom(
      model([topic({ slug: "active", state: "in-progress", lessons: [bead("01.html", "A", "in-progress")] })]),
    );
    const groups = [...doc.querySelectorAll(".grouphd")].map((g) => g.textContent?.toLowerCase().trim());
    expect(groups).toEqual(["in progress"]);
  });

  it("shows a Continue hero naming the in-progress topic with the latest activity", () => {
    const doc = dom(
      model([
        topic({
          slug: "old",
          title: "Older Topic",
          state: "in-progress",
          lastActivityAt: "2026-01-01T00:00:00.000Z",
          nextUp: "Older Next",
          lessons: [bead("01.html", "A", "in-progress")],
        }),
        topic({
          slug: "recent",
          title: "Recent Topic",
          state: "in-progress",
          lastActivityAt: "2026-06-01T00:00:00.000Z",
          nextUp: "Recent Next",
          lessons: [bead("01.html", "A", "in-progress")],
        }),
      ]),
    );
    const hero = doc.querySelector(".hero");
    expect(hero).not.toBeNull();
    expect(hero!.textContent).toContain("Recent Topic");
    expect(hero!.textContent).not.toContain("Older Topic");
    expect(hero!.textContent).toContain("Continue where you left off");
  });

  it("names the authored lesson to resume in the hero, not an unauthored planned title", () => {
    // nextUp is the first *unauthored planned* forecast entry; the hero must name
    // the authored lesson you actually resume (what the Open button and next bead point to).
    const doc = dom(
      model([
        topic({
          slug: "rust",
          title: "Rust",
          state: "in-progress",
          nextUp: "Lifetimes",
          lastActivityAt: "2026-06-01T00:00:00.000Z",
          lessons: [bead("01.html", "Ownership", "completed"), bead("02.html", "Borrowing", "in-progress")],
        }),
      ]),
    );
    const hero = doc.querySelector(".hero")!;
    expect(hero.textContent).toContain("Borrowing");
    expect(hero.textContent).not.toContain("Lifetimes");
  });

  it("shows no hero when nothing is in progress", () => {
    const doc = dom(
      model([topic({ slug: "fresh", state: "not-started", lessons: [bead("01.html", "A", "not-started")] })]),
    );
    expect(doc.querySelector(".hero")).toBeNull();
  });

  it("draws a completed lesson as a done bead and the first unfinished as the next bead", () => {
    const doc = dom(
      model([
        topic({
          slug: "rust",
          state: "in-progress",
          lessons: [
            bead("01.html", "Ownership", "completed"),
            bead("02.html", "Borrowing", "not-started"),
          ],
          journey: { completed: 1, plannedTotal: 2, approximate: false },
        }),
      ]),
    );
    expect(doc.querySelector(".node.done")).not.toBeNull();
    const next = doc.querySelector(".node.next");
    expect(next).not.toBeNull();
    expect(next!.textContent).toContain("Borrowing");
  });

  it("draws planned-not-authored entries as ghost beads, collapsing the tail into a 'more planned' cap", () => {
    const doc = dom(
      model([
        topic({
          slug: "rust",
          state: "in-progress",
          lessons: [bead("01.html", "Ownership", "in-progress")],
          plannedGhosts: ["Lifetimes", "Traits", "Macros", "Async", "Unsafe"],
          journey: { completed: 0, plannedTotal: 6, approximate: true },
        }),
      ]),
    );
    expect(doc.querySelector(".node.ghost")).not.toBeNull();
    // The far tail is not drawn as individual beads; it collapses into an end-cap.
    expect(doc.querySelector(".cap-node")?.textContent).toMatch(/more planned/i);
  });

  it("renders a brand-new topic (no lessons) as a dashed rail, with no bead track", () => {
    const doc = dom(model([topic({ slug: "fresh", title: "Fresh", state: "not-started", lessons: [] })]));
    const rail = doc.querySelector(".rail.newtopic");
    expect(rail).not.toBeNull();
    expect(rail!.textContent?.toLowerCase()).toContain("no lessons authored yet");
    expect(rail!.querySelector(".node")).toBeNull();
  });

  it("collapses a completed topic to a quiet one-line rail", () => {
    const doc = dom(
      model([topic({ slug: "harmony", title: "Harmony", state: "completed", lessons: [bead("01.html", "A", "completed")] })]),
    );
    expect(doc.querySelector(".rail.done-topic")).not.toBeNull();
  });

  it("never emits a headline percentage, and greys the ~ on an approximate journey", () => {
    const html = renderDashboard(
      model([
        topic({
          slug: "rust",
          state: "in-progress",
          lessons: [bead("01.html", "Ownership", "completed")],
          journey: { completed: 1, plannedTotal: 12, approximate: true },
        }),
      ]),
    );
    const doc = new JSDOM(html).window.document;
    // No progress percentage in the visible content (the <style> uses % for layout).
    expect(doc.body.textContent).not.toContain("%");
    // The tilde is present and carried in its own greyed element, not bare text.
    expect(doc.querySelector(".tilde")?.textContent).toContain("~");
  });

  it("links each authored bead to its lesson under the topic slug", () => {
    const doc = dom(
      model([
        topic({ slug: "rust", state: "in-progress", lessons: [bead("01-ownership.html", "Ownership", "completed"), bead("02.html", "B", "not-started")] }),
      ]),
    );
    const hrefs = [...doc.querySelectorAll(".node a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/w/rust/lessons/01-ownership.html");
  });

  it("shows a first-run empty state naming the root when there are no topics", () => {
    const doc = dom(model([], "/home/me/iTeacher"));
    expect(doc.body.textContent).toContain("/home/me/iTeacher");
    expect(doc.querySelector(".rail")).toBeNull();
  });

  it("escapes topic titles", () => {
    const html = renderDashboard(model([topic({ slug: "x", title: "A <script> & B", state: "in-progress", lessons: [bead("01.html", "L", "in-progress")] })]));
    expect(html).not.toContain("<script>");
    expect(html).toContain("A &lt;script&gt; &amp; B");
  });
});
