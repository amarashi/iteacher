import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderDashboard } from "../src/server/dashboard.js";
import type { DashboardModel } from "../src/store/types.js";
import { makeRoot, mission, startServer } from "./helpers.js";

/**
 * Guided-lite hand-off empty state + first-topic auto-flip (#13, from #7b/#7c).
 *
 * Two seams, matching the ticket:
 *   • the empty/waiting screen is server-rendered — asserted at the pure render
 *     seam (`renderDashboard` of a topic-less model) and the HTTP seam (`GET /`);
 *   • the auto-flip rides the #12 SSE channel — materialise the first workspace
 *     with a MISSION.md, and the very next `GET /` is the journey-rail dashboard.
 *
 * The purely client-side bits (copy buttons firing the clipboard, the celebration
 * animation) are verified in a browser, not asserted as DOM trivia here — we only
 * check that the hand-off is a copyable, explicit hand-off and that the flip is
 * wired.
 */

function empty(root = "/home/me/iTeacher"): DashboardModel {
  return { root, topics: [] };
}

function doc(model: DashboardModel): Document {
  return new JSDOM(renderDashboard(model)).window.document;
}

describe("guided-lite hand-off empty state (#13) — render seam", () => {
  it("is an explicit, copyable hand-off: terminal in the root, run claude, paste a starter prompt", () => {
    const d = doc(empty("/home/me/iTeacher"));

    // (1) open a terminal in the *copyable absolute root path*.
    expect(d.body.textContent).toContain("/home/me/iTeacher");
    const copyPath = [...d.querySelectorAll("[data-copy]")].find(
      (b) => b.getAttribute("data-copy") === "/home/me/iTeacher",
    );
    expect(copyPath).toBeTruthy();

    // (2) run `claude`.
    expect(d.body.textContent?.toLowerCase()).toContain("claude");

    // (3) paste a *copyable* starter prompt that names the teach skill.
    const copyPrompt = [...d.querySelectorAll("[data-copy]")].find((b) =>
      /teach skill/i.test(b.getAttribute("data-copy") ?? ""),
    );
    expect(copyPrompt).toBeTruthy();
  });

  it("shows a live 'watching this folder' affordance and no rails yet", () => {
    const d = doc(empty());
    expect(d.body.textContent?.toLowerCase()).toContain("watching this folder");
    expect(d.querySelector(".rail")).toBeNull();
  });

  it("escapes a hostile root path into the copyable field", () => {
    const html = renderDashboard(empty('/tmp/"><script>alert(1)</script>'));
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("wires the one-time first-topic celebration into the page", () => {
    // The celebration is client-side (it fires on the empty→topics flip), so we
    // assert only that its copy is carried in the page for the flip to inject —
    // analogous to the existing SSE-subscription wiring assertion.
    const html = renderDashboard(empty());
    expect(html).toContain("Your first topic is here");
  });
});

describe("guided-lite hand-off + auto-flip (#13) — HTTP + SSE seam", () => {
  it("serves the guided hand-off at GET / for an empty root", async () => {
    const { root, cleanup } = makeRoot({});
    const { base, close } = await startServer(root);
    try {
      const html = await (await fetch(`${base}/`)).text();
      expect(html).toContain("No topics yet");
      expect(html).toContain(root); // the copyable absolute root
      expect(html.toLowerCase()).toContain("watching this folder");
      expect(html).not.toContain('class="rail"');
    } finally {
      await close();
      cleanup();
    }
  });

  it("flips to the journey-rail dashboard once the first MISSION.md appears", async () => {
    const { root, cleanup } = makeRoot({});
    const { base, close } = await startServer(root);
    try {
      // Empty root → hand-off.
      expect(await (await fetch(`${base}/`)).text()).toContain("No topics yet");

      // Claude Code authors the first workspace alongside.
      const dir = join(root, "photography");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "MISSION.md"), mission("Landscape Photography"));

      // The very next load (what the SSE-driven re-fetch pulls) is the dashboard,
      // showing the brand-new-topic rail rather than the hand-off.
      const html = await (await fetch(`${base}/`)).text();
      expect(html).not.toContain("No topics yet");
      expect(html).toContain("Landscape Photography");
      expect(html).toContain('class="rail'); // a real journey rail now renders
    } finally {
      await close();
      cleanup();
    }
  });
});
