/**
 * The iTeacher server (issues #5 render surface + #6 runtime).
 *
 * A local Node web app over `localhost` (the shell decision, #3): it renders a
 * root folder of teach workspaces and records lesson progress. It hosts no
 * teaching agent — authoring is delegated to Claude Code running `teach`; this
 * server only reads workspace files and writes `progress.json` via the store.
 *
 * Routes:
 *   GET  /                       — dashboard over the root
 *   GET  /api/dashboard          — the DashboardModel as JSON
 *   GET  /w/:topic/<path>        — a workspace file, served with its on-disk
 *                                  layout intact so teach's relative links work;
 *                                  lesson pages get injected chrome + bridge
 *   GET  /_iteacher/bridge.js    — the runtime bridge script
 *   POST /api/progress           — one completion fact → recordCompletion
 */

import express, { type Express, type Request, type Response } from "express";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, isAbsolute, basename } from "node:path";
import { deriveDashboard, recordCompletion } from "../store/index.js";
import type { CompletionEvent, DashboardModel, TopicModel } from "../store/types.js";
import { BRIDGE_SOURCE } from "./bridge.js";
import { injectChrome } from "./render.js";
import { renderDashboard } from "./dashboard.js";
import { journeyLabel } from "./html.js";

export function createApp(rootDir: string): Express {
  const root = resolve(rootDir);
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  app.get("/_iteacher/bridge.js", (_req, res) => {
    res.type("application/javascript").send(BRIDGE_SOURCE);
  });

  app.get("/api/dashboard", (_req, res) => {
    res.json(deriveDashboard(root));
  });

  app.get("/", (_req, res) => {
    res.type("html").send(renderDashboard(deriveDashboard(root)));
  });

  app.post("/api/progress", (req, res) => {
    const event = parseEvent(req.body);
    if (!event) return res.status(400).json({ error: "invalid event" });
    const { topic } = req.body as { topic?: unknown };
    if (typeof topic !== "string" || !isWorkspace(root, topic)) {
      return res.status(404).json({ error: "unknown topic" });
    }
    recordCompletion(join(root, topic), event);
    res.status(204).end();
  });

  app.get("/w/:topic/*", (req, res) => serveWorkspaceFile(root, req, res));

  return app;
}

// --- workspace file serving ------------------------------------------------

function serveWorkspaceFile(root: string, req: Request, res: Response): void {
  const topic = req.params.topic!;
  const rest = (req.params as Record<string, string>)[0] ?? "";
  if (!isWorkspace(root, topic)) {
    res.status(404).send("Unknown topic");
    return;
  }
  const abs = resolveWithin(join(root, topic), rest);
  if (!abs || !existsSync(abs) || !statSync(abs).isFile()) {
    res.status(404).send("Not found");
    return;
  }

  if (isLessonFile(rest)) {
    res.type("html").send(renderLesson(root, topic, basename(rest), abs));
    return;
  }
  // Everything else — reference docs, assets, images — served verbatim so the
  // workspace's own relative links resolve unchanged.
  res.sendFile(abs);
}

function renderLesson(root: string, topic: string, file: string, abs: string): string {
  const html = readFileSync(abs, "utf8");
  const model = deriveDashboard(root);
  const t = model.topics.find((x) => x.slug === topic);
  const bead = t?.lessons.find((l) => l.file === file);
  return injectChrome(html, {
    topic,
    lesson: file,
    topicTitle: t?.title ?? topic,
    lessonTitle: bead?.title ?? file,
    // The bar names the lesson currently open — its 1-based position in the arc.
    progressText: journeyLabel(currentPosition(t, file), t?.journey.plannedTotal ?? 0),
    completed: bead?.state === "completed",
    nextHref: nextLessonHref(topic, t, file),
  });
}

/** 1-based position of `file` in teaching order, else one past what's completed. */
function currentPosition(t: TopicModel | undefined, file: string): number {
  if (!t) return 0;
  const idx = t.lessons.findIndex((l) => l.file === file);
  return idx >= 0 ? idx + 1 : Math.min(t.journey.completed + 1, t.journey.plannedTotal);
}

/** Forward-nav: the next lesson in teaching order after `file` (#5), or null at the end. */
function nextLessonHref(topic: string, t: TopicModel | undefined, file: string): string | null {
  if (!t) return null;
  const idx = t.lessons.findIndex((l) => l.file === file);
  const next = idx >= 0 ? t.lessons[idx + 1] : undefined;
  if (!next) return null;
  return `/w/${encodeURIComponent(topic)}/lessons/${encodeURIComponent(next.file)}`;
}

// --- validation & path safety ----------------------------------------------

function isWorkspace(root: string, topic: string): boolean {
  if (!isPlainSegment(topic)) return false;
  return existsSync(join(root, topic, "MISSION.md"));
}

/** A single path segment with no traversal or separators. */
function isPlainSegment(seg: string): boolean {
  return seg.length > 0 && !seg.includes("/") && !seg.includes("\\") && seg !== "." && seg !== "..";
}

/** Resolve `rel` under `base`, returning null if it would escape `base`. */
function resolveWithin(base: string, rel: string): string | null {
  const abs = resolve(base, rel);
  const rp = relative(base, abs);
  if (rp === "") return abs; // the base itself
  if (rp.startsWith("..") || isAbsolute(rp)) return null;
  return abs;
}

function isLessonFile(rest: string): boolean {
  return /^lessons\/[^/]+\.html?$/i.test(rest);
}

// --- event parsing ---------------------------------------------------------

/** Validate and narrow a POST body into a CompletionEvent, or null if malformed. */
function parseEvent(body: unknown): CompletionEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const lesson = b.lesson;
  if (typeof lesson !== "string" || !isPlainSegment(lesson)) return null;

  switch (b.type) {
    case "lesson-opened":
      return { type: "lesson-opened", lesson };
    case "lesson-completed":
      return { type: "lesson-completed", lesson };
    case "exercise": {
      const exerciseId = b.exerciseId;
      if (typeof exerciseId !== "string" || exerciseId.length === 0) return null;
      const status = b.status === "passed" ? "passed" : "attempted";
      const score = typeof b.score === "number" && Number.isFinite(b.score) ? b.score : undefined;
      return { type: "exercise", lesson, exerciseId, status, ...(score !== undefined ? { score } : {}) };
    }
    default:
      return null;
  }
}

export type { DashboardModel };
