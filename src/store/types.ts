/**
 * Public contract of the workspace store (iTeacher data layer, issue #1).
 *
 * Two seams only — {@link import("./workspace.js").deriveDashboard} (read + derive)
 * and {@link import("./workspace.js").recordCompletion} (write one raw fact).
 * The `SYLLABUS.md` / `progress.json` on-disk formats are internal to the store;
 * everything a caller sees is expressed in the types below.
 */

/** Lifecycle of a single lesson, widening only: not-started → in-progress → completed. */
export type LessonState = "not-started" | "in-progress" | "completed";

/** A raw completion fact, as handed to {@link recordCompletion}. */
export type CompletionEvent =
  | { type: "lesson-opened"; lesson: string }
  | { type: "lesson-completed"; lesson: string }
  | {
      type: "exercise";
      lesson: string;
      exerciseId: string;
      status: "attempted" | "passed";
      /** Optional mastery signal in [0, 1] (or any numeric scale the widget uses). */
      score?: number;
    };

/** One authored lesson on disk, joined to its recorded state. */
export interface LessonBead {
  /** Filename within `lessons/`, e.g. `01-intro.html`. The stable key. */
  file: string;
  /** Display title — from the linked syllabus entry, else derived from the filename. */
  title: string;
  state: LessonState;
}

/**
 * Soft-journey position. Deliberately not a single headline percentage — the
 * provisional arc cannot support that precision, so the pair is exposed with an
 * `approximate` flag for the UI to render honestly (e.g. "Lesson 4 of ~12").
 */
export interface JourneyPosition {
  completed: number;
  /** Provisional arc total: syllabus-entry count when present, else lessons on disk. */
  plannedTotal: number;
  approximate: boolean;
}

/** Everything the dashboard needs to render one topic. */
export interface TopicModel {
  /** Folder name under the root — the topic's stable slug. */
  slug: string;
  /** Absolute path to the workspace folder. */
  dir: string;
  /** From the `# Mission: {Topic}` heading, falling back to the folder name. */
  title: string;
  /** Count of `lessons/*.html` files actually on disk. */
  lessonsAuthored: number;
  lessonsCompleted: number;
  /** Distinct exercises recorded as `passed` across all lessons. */
  homeworksDone: number;
  /** Title of the next still-planned syllabus entry, or null if none forecast. */
  nextUp: string | null;
  /** Remaining planned syllabus titles after next-up, in order. */
  futureTitles: string[];
  journey: JourneyPosition;
  /**
   * ISO-8601 timestamp of this topic's most recent recorded activity (lesson
   * opened/completed or exercise updated), or null if nothing has been recorded.
   * Drives the dashboard's *Continue where you left off* hero — the in-progress
   * topic with the latest activity leads. Derived from `progress.json`; not stored.
   */
  lastActivityAt: string | null;
  /** Authored lessons on disk, in filename order (the journey-rail beads). */
  lessons: LessonBead[];
  /** Planned syllabus titles not yet linked to a lesson (the fading ghost beads). */
  plannedGhosts: string[];
  /** Topic momentum, derived from its lessons and forecast. */
  state: LessonState;
}

/** The single UI contract returned by {@link deriveDashboard}. */
export interface DashboardModel {
  /** Absolute path to the scanned root folder. */
  root: string;
  topics: TopicModel[];
}
