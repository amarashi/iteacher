/**
 * Per-course color identity.
 *
 * Every course (topic workspace) is assigned one accent from a fixed five-blue
 * palette, derived deterministically from its folder slug — nothing is stored,
 * and a course's color never shifts when other topics come or go. The same
 * assignment is used everywhere the course appears: the dashboard rail, the
 * study shell, the chrome injected into served lessons, and the authoring
 * agent's opening prompt (so the lessons it writes match the app's chrome).
 * The lesson-facing contract (`--course-accent` & friends) is documented for
 * authors in `teach/SKILL.md` under "Course color".
 */

/** The fixed course palette, light → deep. */
export const COURSE_PALETTE = ["#00ddff", "#00b8ff", "#0097e1", "#004fa7", "#092b80"] as const;

export interface CourseTheme {
  /** The assigned palette hex. */
  accent: string;
  /** Darkened accent for hover states. */
  hover: string;
  /** Translucent accent tint for soft fills and glows. */
  soft: string;
  /** Readable text color on the accent (bright cyans take deep blue, deep blues take white). */
  contrast: string;
  /** `"r, g, b"` — for prose (the agent prompt). */
  rgb: string;
}

/** The palette hex assigned to a course slug. Deterministic (djb2 mod palette). */
export function courseColor(slug: string): string {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h * 33) ^ slug.charCodeAt(i)) >>> 0;
  return COURSE_PALETTE[h % COURSE_PALETTE.length]!;
}

/** The full derived theme for a course slug. */
export function courseTheme(slug: string): CourseTheme {
  const hex = courseColor(slug);
  const [r, g, b] = hexRgb(hex);
  const darken = (v: number) => Math.round(v * 0.78);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  // YIQ perceptual brightness — the two light cyans sit above the threshold.
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return {
    accent: hex,
    hover: `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`,
    soft: `rgba(${r},${g},${b},.16)`,
    contrast: yiq >= 128 ? "#092b80" : "#ffffff",
    rgb: `${r}, ${g}, ${b}`,
  };
}

/**
 * Inline CSS-variable overrides that re-theme a design-token subtree (see
 * `tokens.ts`) to the course accent — drop into a `style` attribute.
 */
export function themeVars(slug: string): string {
  const t = courseTheme(slug);
  return (
    `--accent:${t.accent};--accent-hover:${t.hover};--accent-soft:${t.soft};` +
    `--accent-contrast:${t.contrast};--link:${t.accent};--link-hover:${t.hover}`
  );
}

/**
 * The `--course-accent*` custom properties injected into every served lesson
 * page, so agent-authored lessons can write `var(--course-accent, <hex>)` and
 * always match the app's assignment.
 */
export function courseVarsCss(slug: string): string {
  const t = courseTheme(slug);
  return (
    `:root{--course-accent:${t.accent};--course-accent-hover:${t.hover};` +
    `--course-accent-soft:${t.soft};--course-accent-contrast:${t.contrast}}`
  );
}

function hexRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
