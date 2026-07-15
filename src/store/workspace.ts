/**
 * The workspace store — iTeacher's data layer (issue #1).
 *
 * Turns a root folder of `teach` workspaces into a single derived view, and
 * records raw completion facts back into each workspace. Strictly **additive**:
 * it reads teach's own files and adds only `SYLLABUS.md` + `progress.json`,
 * never touching an existing teach format.
 *
 *   - {@link deriveDashboard} — read + derive. No metric is stored; every count
 *     is computed from raw facts, so adding a lesson never leaves a stale number.
 *   - {@link recordCompletion} — write one raw fact via a monotonic apply.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  CompletionEvent,
  DashboardModel,
  LessonBead,
  LessonState,
  TopicModel,
} from "./types.js";
import { parseSyllabus, type SyllabusEntry } from "./syllabus.js";
import { applyEvent, readProgress, writeProgress, type ProgressFile } from "./progress.js";

export type { CompletionEvent, DashboardModel, TopicModel, LessonBead, LessonState } from "./types.js";

const MISSION = "MISSION.md";
const SYLLABUS = "SYLLABUS.md";
const PROGRESS = "progress.json";
const LESSONS_DIR = "lessons";

/** Scan `rootDir` for teach workspaces and derive the dashboard model. */
export function deriveDashboard(rootDir: string): DashboardModel {
  const topics: TopicModel[] = [];
  for (const slug of listWorkspaceSlugs(rootDir)) {
    const dir = join(rootDir, slug);
    if (!existsSync(join(dir, MISSION))) continue;
    topics.push(deriveTopic(rootDir, slug));
  }
  topics.sort((a, b) => a.slug.localeCompare(b.slug));
  return { root: rootDir, topics };
}

/**
 * Record one raw completion fact into a workspace's `progress.json`,
 * creating the file if absent. The only writer of that store.
 */
export function recordCompletion(workspaceDir: string, event: CompletionEvent): void {
  const file = join(workspaceDir, PROGRESS);
  const data = readProgress(file);
  applyEvent(data, event, new Date().toISOString());
  writeProgress(file, data);
}

// --- internals -------------------------------------------------------------

function listWorkspaceSlugs(rootDir: string): string[] {
  try {
    return readdirSync(rootDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function deriveTopic(rootDir: string, slug: string): TopicModel {
  const dir = join(rootDir, slug);
  const title = readMissionTitle(join(dir, MISSION)) ?? slug;
  const entries = readSyllabusEntries(dir);
  const progress = readProgress(join(dir, PROGRESS));
  const lessonFiles = listLessonFiles(dir);

  const lessons = buildLessons(lessonFiles, entries, progress);
  const lessonsCompleted = lessons.filter((l) => l.state === "completed").length;
  const homeworksDone = countPassedExercises(progress);

  // Planned (not-yet-authored) entries drive next-up, future titles, and ghosts.
  const plannedEntries = entries.filter((e) => e.status !== "authored");
  const plannedTitles = plannedEntries.map((e) => e.title);
  const nextUp = plannedTitles[0] ?? null;
  const futureTitles = plannedTitles.slice(1);

  // Arc total: the forecast's length when it exists, else what's on disk.
  const plannedTotal = entries.length > 0 ? entries.length : lessonFiles.length;

  return {
    slug,
    dir,
    title,
    lessonsAuthored: lessonFiles.length,
    lessonsCompleted,
    homeworksDone,
    nextUp,
    futureTitles,
    journey: { completed: lessonsCompleted, plannedTotal, approximate: true },
    lessons,
    plannedGhosts: plannedTitles,
    state: topicState(lessons, plannedEntries.length),
  };
}

function readMissionTitle(file: string): string | null {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^#\s+Mission:\s*(.+\S)\s*$/i.exec(line);
    if (m) return m[1]!.trim();
  }
  return null;
}

function readSyllabusEntries(dir: string): SyllabusEntry[] {
  try {
    return parseSyllabus(readFileSync(join(dir, SYLLABUS), "utf8"));
  } catch {
    return [];
  }
}

function listLessonFiles(dir: string): string[] {
  try {
    return readdirSync(join(dir, LESSONS_DIR), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".html"))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

function buildLessons(
  files: string[],
  entries: SyllabusEntry[],
  progress: ProgressFile,
): LessonBead[] {
  const titleByFile = new Map<string, string>();
  for (const e of entries) if (e.lesson) titleByFile.set(e.lesson, e.title);
  return files.map((file) => ({
    file,
    title: titleByFile.get(file) ?? deriveTitleFromFilename(file),
    state: progress.lessons[file]?.state ?? "not-started",
  }));
}

/** `01-variables-and-types.html` → `Variables And Types`. Fallback only. */
function deriveTitleFromFilename(file: string): string {
  const base = file.replace(/\.html?$/i, "").replace(/^\d+[-_.\s]*/, "");
  const words = base.split(/[-_.\s]+/).filter(Boolean);
  if (words.length === 0) return file;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function countPassedExercises(progress: ProgressFile): number {
  let n = 0;
  for (const byId of Object.values(progress.exercises)) {
    for (const ex of Object.values(byId)) if (ex.status === "passed") n++;
  }
  return n;
}

function topicState(lessons: LessonBead[], plannedRemaining: number): LessonState {
  const anyStarted = lessons.some((l) => l.state !== "not-started");
  if (!anyStarted) return "not-started";
  const allDone = lessons.length > 0 && lessons.every((l) => l.state === "completed");
  if (allDone && plannedRemaining === 0) return "completed";
  return "in-progress";
}
