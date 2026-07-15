import { describe, it, expect } from "vitest";
import { COURSE_PALETTE, courseColor, courseTheme, courseVarsCss, themeVars } from "../src/server/theme.js";
import { injectChrome } from "../src/server/render.js";

/**
 * Per-course color identity: every course gets one of the five palette blues,
 * deterministically from its slug, and the same assignment flows into the
 * dashboard vars, the lesson-page `--course-accent*` contract, and (via the
 * agent prompt) the lessons themselves.
 */

describe("courseColor / courseTheme", () => {
  it("always assigns a color from the fixed five-blue palette", () => {
    for (const slug of ["rust", "go", "yoga-for-beginners", "x", "", "mortgages-101"]) {
      expect(COURSE_PALETTE).toContain(courseColor(slug));
    }
  });

  it("is deterministic — the same slug always gets the same color", () => {
    expect(courseColor("chess-basics")).toBe(courseColor("chess-basics"));
  });

  it("gives readable contrast text: dark on the light cyans, white on the deep blue", () => {
    const bySlugColor = new Map<string, string>();
    // Sweep slugs until every palette color has been assigned at least once.
    for (let i = 0; bySlugColor.size < COURSE_PALETTE.length && i < 500; i++) {
      const slug = `topic-${i}`;
      bySlugColor.set(courseColor(slug), courseTheme(slug).contrast);
    }
    expect(bySlugColor.size).toBe(COURSE_PALETTE.length); // hash reaches all five
    expect(bySlugColor.get("#3ce0e0")).toBe("#092b80"); // bright aqua → deep-ink text
    expect(bySlugColor.get("#4a70e0")).toBe("#ffffff"); // the deeper blue → white text
  });

  it("emits the accent into the dashboard vars and the lesson-page contract", () => {
    const hex = courseColor("rust");
    expect(themeVars("rust")).toContain(`--accent:${hex}`);
    expect(courseVarsCss("rust")).toContain(`--course-accent:${hex}`);
  });
});

describe("injectChrome — course color on served lessons", () => {
  const ctx = {
    topic: "rust",
    lesson: "01.html",
    topicTitle: "Rust",
    lessonTitle: "Ownership",
    progressText: "Lesson 1 of ~3",
    completed: false,
    nextHref: null,
  };

  it("injects the course's --course-accent variables into the page head", () => {
    const out = injectChrome("<html><head></head><body>hi</body></html>", ctx);
    expect(out).toContain(`--course-accent:${courseColor("rust")}`);
  });

  it("injects them in embed mode too (the study iframe)", () => {
    const out = injectChrome("<html><head></head><body>hi</body></html>", { ...ctx, embed: true });
    expect(out).toContain(`--course-accent:${courseColor("rust")}`);
  });
});
