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
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, relative, isAbsolute, basename } from "node:path";
import { deriveDashboard, recordCompletion } from "../store/index.js";
import type { CompletionEvent, DashboardModel, TopicModel } from "../store/types.js";
import { readConfig, writeConfig } from "../store/config.js";
import { BRIDGE_SOURCE } from "./bridge.js";
import { createEventStream } from "./events.js";
import { startSession, replyToSession, subscribe } from "./agent.js";
import { injectChrome } from "./render.js";
import { renderDashboard } from "./dashboard.js";
import { renderWelcome } from "./welcome.js";
import { journeyLabel } from "./html.js";

/**
 * How the app resolves its root. The root may be undecided at startup — the
 * first-run flow (#10) leaves it null and serves the welcome screen until the
 * learner confirms one via `POST /api/root`.
 */
export interface AppOptions {
  /** Where to persist the confirmed root. Empty ⇒ never persist (override mode). */
  configPath: string;
  /** The resolved absolute path proposed on first run. */
  defaultRoot: string;
  /** Sync-folder label surfaced as a welcome subtitle, or null. */
  syncFolder?: string | null;
  /** A `--root` / `ITEACHER_ROOT` override: forces a root and skips first-run. */
  override?: string | null;
}

/**
 * A bare string is the legacy form — a fixed, already-resolved root that skips
 * first-run entirely (used by the render/runtime tests, and equivalent to an
 * override).
 */
export function createApp(config: AppOptions | string): Express {
  const opts: AppOptions =
    typeof config === "string" ? { configPath: "", defaultRoot: config, override: config } : config;

  // The current root. `null` until first-run confirmation; reassigned by the
  // POST handler, so every route reads this binding live.
  let root: string | null = initialRoot(opts);
  if (root) mkdirSync(root, { recursive: true });

  const app = express();
  app.use(express.json({ limit: "64kb" }));

  // Live dashboard updates (#12): watch the root, notify open dashboards on change.
  const streamEvents = createEventStream(() => root);

  app.get("/_iteacher/bridge.js", (_req, res) => {
    res.type("application/javascript").send(BRIDGE_SOURCE);
  });

  app.get("/api/events", streamEvents);

  app.get("/", (_req, res) => {
    if (!root) {
      res.type("html").send(renderWelcome({ defaultRoot: opts.defaultRoot, syncFolder: opts.syncFolder ?? null }));
      return;
    }
    res.type("html").send(renderDashboard(deriveDashboard(root)));
  });

  // First-run: create + persist the chosen root, then subsequent loads are the
  // dashboard. The chosen path is guarded against traversal before it is written.
  app.post("/api/root", (req, res) => {
    const chosen = chooseRoot(req.body, opts.defaultRoot);
    if (!chosen) return res.status(400).json({ error: "invalid path" });
    mkdirSync(chosen, { recursive: true });
    if (opts.configPath) writeConfig(opts.configPath, { root: chosen });
    root = chosen;
    res.status(200).json({ root: chosen });
  });

  app.get("/api/dashboard", (_req, res) => {
    if (!root) return res.status(404).json({ error: "no root selected" });
    res.json(deriveDashboard(root));
  });

  app.post("/api/progress", (req, res) => {
    if (!root) return res.status(404).json({ error: "no root selected" });
    const event = parseEvent(req.body);
    if (!event) return res.status(400).json({ error: "invalid event" });
    const { topic } = req.body as { topic?: unknown };
    if (typeof topic !== "string" || !isWorkspace(root, topic)) {
      return res.status(404).json({ error: "unknown topic" });
    }
    recordCompletion(join(root, topic), event);
    res.status(204).end();
  });

  app.get("/w/:topic/*", (req, res) => {
    if (!root) return res.status(404).send("No root selected");
    serveWorkspaceFile(root, req, res);
  });

  // --- in-app teaching agent (phase-2 host, demo) --------------------------
  // Start a conversation with the teaching agent; it authors into a new
  // workspace folder under the root, and the dashboard's own watch reveals it.
  app.post("/api/teach/start", (req, res) => {
    if (!root) return res.status(404).json({ error: "no root selected" });
    const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
    if (!topic || topic.length > 300) return res.status(400).json({ error: "invalid topic" });
    const { sessionId, slug } = startSession(root, topic);
    res.status(202).json({ sessionId, slug });
  });

  // The agent's streamed turn — assistant prose, tool/authoring hints, turn-complete.
  app.get("/api/teach/:id/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n: connected\n\n");
    const unsubscribe = subscribe(req.params.id, (e) => res.write(`data: ${JSON.stringify(e)}\n\n`));
    if (!unsubscribe) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "session not found" })}\n\n`);
      return res.end();
    }
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
    heartbeat.unref();
    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  // The user's reply → the agent's next turn (streamed over the events channel above).
  app.post("/api/teach/:id/reply", (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) return res.status(400).json({ error: "empty reply" });
    const ok = replyToSession(req.params.id, text);
    if (!ok) return res.status(409).json({ error: "unknown or busy session" });
    res.status(202).end();
  });

  return app;
}

// --- root resolution -------------------------------------------------------

/** The root to start with: an override, else a persisted config, else undecided. */
function initialRoot(opts: AppOptions): string | null {
  if (opts.override) return resolve(opts.override);
  if (opts.configPath) {
    const cfg = readConfig(opts.configPath);
    if (cfg) return cfg.root;
  }
  return null;
}

/**
 * The root a `POST /api/root` selects: an absent `path` accepts the default; a
 * present one must be a non-empty, traversal-free string. Null ⇒ reject (400).
 */
function chooseRoot(body: unknown, defaultRoot: string): string | null {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (b.path === undefined) return defaultRoot; // accept the default
  if (typeof b.path !== "string") return null;
  return sanitizeRootPath(b.path);
}

/** Resolve a user-supplied root to an absolute path, rejecting traversal segments. */
function sanitizeRootPath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("\0")) return null;
  // The write-path traversal guard: no `..` segment may appear in the raw input.
  if (trimmed.split(/[/\\]+/).some((seg) => seg === "..")) return null;
  return resolve(trimmed);
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
