/**
 * Internal read/write for `progress.json` — the app-managed store of raw
 * completion facts. Machine state, never hand-edited. Not part of the public
 * surface; the store exposes only derived counts and the two seams.
 *
 * The apply logic is **monotonic**: state only ever widens
 * (not-started → in-progress → completed; attempted → passed) and scores only
 * ever climb, so replaying an event out of order — a re-open after completion,
 * a late `attempted` beacon after a `passed` — never regresses recorded truth.
 */

import { readFileSync, writeFileSync } from "node:fs";
import type { CompletionEvent, LessonState } from "./types.js";

export interface LessonFact {
  state: Extract<LessonState, "in-progress" | "completed">;
  openedAt?: string;
  completedAt?: string;
}

export interface ExerciseFact {
  status: "attempted" | "passed";
  score?: number;
  firstSeenAt?: string;
  updatedAt?: string;
}

export interface ProgressFile {
  version: 1;
  /** Keyed by lesson filename. Absent lessons are not-started. */
  lessons: Record<string, LessonFact>;
  /** Keyed by lesson filename, then stable exercise id. */
  exercises: Record<string, Record<string, ExerciseFact>>;
}

export function emptyProgress(): ProgressFile {
  return { version: 1, lessons: {}, exercises: {} };
}

/** Read and normalise `progress.json`. Returns an empty store if absent or unreadable. */
export function readProgress(file: string): ProgressFile {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return emptyProgress();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressFile>;
    return {
      version: 1,
      lessons: parsed.lessons ?? {},
      exercises: parsed.exercises ?? {},
    };
  } catch {
    // A corrupt store must not crash the dashboard; treat it as empty.
    return emptyProgress();
  }
}

export function writeProgress(file: string, data: ProgressFile): void {
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Apply one completion fact in place, monotonically. Returns the mutated store. */
export function applyEvent(data: ProgressFile, event: CompletionEvent, now: string): ProgressFile {
  switch (event.type) {
    case "lesson-opened": {
      const existing = data.lessons[event.lesson];
      if (!existing) {
        data.lessons[event.lesson] = { state: "in-progress", openedAt: now };
      } else if (!existing.openedAt) {
        existing.openedAt = now;
      }
      // Never downgrade a completed lesson back to in-progress.
      break;
    }
    case "lesson-completed": {
      const existing = data.lessons[event.lesson];
      if (!existing) {
        data.lessons[event.lesson] = { state: "completed", openedAt: now, completedAt: now };
      } else {
        existing.state = "completed";
        existing.completedAt ??= now;
        existing.openedAt ??= now;
      }
      break;
    }
    case "exercise": {
      const byLesson = (data.exercises[event.lesson] ??= {});
      const existing = byLesson[event.exerciseId];
      // passed outranks attempted; once passed it stays passed.
      const status = existing?.status === "passed" ? "passed" : event.status;
      const score = pickScore(existing?.score, event.score);
      byLesson[event.exerciseId] = {
        status,
        ...(score !== undefined ? { score } : {}),
        firstSeenAt: existing?.firstSeenAt ?? now,
        updatedAt: now,
      };
      break;
    }
  }
  return data;
}

/** Keep the highest score seen; either operand may be absent. */
function pickScore(prev: number | undefined, next: number | undefined): number | undefined {
  if (prev === undefined) return next;
  if (next === undefined) return prev;
  return Math.max(prev, next);
}
