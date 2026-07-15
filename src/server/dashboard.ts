/**
 * A deliberately minimal placeholder index over the DashboardModel.
 *
 * Its only jobs are to give `← Dashboard` a landing target and to make the
 * vertical slice drivable: list each topic, its derived counts (honestly — an
 * approximate journey, no headline %), its next-up, and links into its lessons.
 *
 * It is intentionally NOT the journey-rail information architecture — that is
 * issue #4's build (reference: `prototypes/dashboard-ia.html`), which will
 * consume this same model and render the beads, ghost beads, hero, and grouping.
 * Keeping this page plain avoids reimplementing #4 ahead of it.
 */

import type { DashboardModel, TopicModel } from "../store/types.js";
import { esc, journeyLabel } from "./html.js";

export function renderDashboardPage(model: DashboardModel): string {
  const body =
    model.topics.length === 0 ? emptyState(model.root) : model.topics.map(topicRow).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iTeacher</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<header class="hero">
<h1>iTeacher</h1>
<p class="hero__root">${esc(model.root)}</p>
</header>
<main class="topics">
${body}
</main>
</body>
</html>`;
}

function topicRow(t: TopicModel): string {
  const lessons = t.lessons
    .map(
      (l) =>
        `<li class="lesson lesson--${l.state}">` +
        `<a href="/w/${encodeURIComponent(t.slug)}/lessons/${encodeURIComponent(l.file)}">${esc(
          l.title,
        )}</a></li>`,
    )
    .join("");
  const nextUp = t.nextUp ? `<p class="topic__next">Next up: <strong>${esc(t.nextUp)}</strong></p>` : "";
  return `<section class="topic">
<h2 class="topic__title">${esc(t.title)}</h2>
<p class="topic__stats">
${esc(journeyLabel(t.journey.completed, t.journey.plannedTotal))}
<span class="dot">·</span> ${t.lessonsCompleted}/${t.lessonsAuthored} lessons done
<span class="dot">·</span> ${t.homeworksDone} homeworks
</p>
${nextUp}
<ul class="lessons">${lessons}</ul>
</section>`;
}

function emptyState(root: string): string {
  return `<section class="empty">
<h2>No topics yet</h2>
<p>Point Claude Code at <code>${esc(root)}</code> and run <code>teach</code> to author your first workspace.</p>
</section>`;
}

const PAGE_CSS = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:#f6f7f9;color:#1a1c22}
@media (prefers-color-scheme:dark){body{background:#0e0f13;color:#e7e9ee}}
.hero{padding:32px 24px 8px}
.hero h1{margin:0;font-size:28px}
.hero__root{margin:4px 0 0;opacity:.55;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.topics{padding:16px 24px 48px;display:grid;gap:16px;max-width:900px}
.topic{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:20px}
@media (prefers-color-scheme:dark){.topic{background:#171922;border-color:rgba(255,255,255,.07)}}
.topic__title{margin:0 0 4px;font-size:20px}
.topic__stats{margin:0;opacity:.7;font-size:14px;font-variant-numeric:tabular-nums}
.topic__next{margin:8px 0 0;font-size:14px}
.dot{opacity:.35;margin:0 4px}
.lessons{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0;padding:0}
.lesson{font-size:13px;border-radius:6px;padding:4px 10px;border:1px solid rgba(127,127,127,.25)}
.lesson a{text-decoration:none;color:inherit}
.lesson--in-progress{font-weight:600}
.lesson--completed{opacity:.6}
.empty{padding:48px 24px;opacity:.75}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}
`;
