/**
 * The journey-rail dashboard (issue #4) — a pure function `DashboardModel → HTML`.
 *
 * Each topic is a horizontal arc of lesson beads (done → next → planned) under a
 * *Continue where you left off* hero, in fixed groups In progress → Not started →
 * Completed. Provisionality is drawn structurally: no headline percentage, a greyed
 * `~` on soft-journey figures, dashed ghost beads for planned-not-authored lessons,
 * and long rails windowed (recent done → next → a few ahead + end-caps) rather than
 * horizontally scrolled. Reference: `prototypes/dashboard-ia.html`.
 *
 * Consumes the `DashboardModel` from the store (#1) as-is — beads come straight
 * from each lesson's recorded state, ghosts from `plannedGhosts`, and the hero
 * from `lastActivityAt`. No metric is recomputed here.
 */

import type { DashboardModel, TopicModel, LessonBead } from "../store/types.js";
import { esc, journeyLabel } from "./html.js";

const AHEAD = 3; // beads to draw past the next-up lesson before collapsing to a cap
const BEHIND = 1; // recent completed beads to keep for context

export function renderDashboard(model: DashboardModel): string {
  const inProgress = model.topics
    .filter((t) => t.state === "in-progress")
    .sort(byRecentActivity);
  const notStarted = model.topics.filter((t) => t.state === "not-started");
  const completed = model.topics.filter((t) => t.state === "completed");

  const body =
    model.topics.length === 0
      ? emptyState(model.root)
      : hero(inProgress[0]) +
        group("In progress", inProgress, rail) +
        group("Not started", notStarted, rail) +
        group("Completed", completed, railDone);

  return page(model, body);
}

/** Most-recently-active first; topics with no activity sort last, then by slug. */
function byRecentActivity(a: TopicModel, b: TopicModel): number {
  if (a.lastActivityAt && b.lastActivityAt) return b.lastActivityAt.localeCompare(a.lastActivityAt);
  if (a.lastActivityAt) return -1;
  if (b.lastActivityAt) return 1;
  return a.slug.localeCompare(b.slug);
}

function group(label: string, topics: TopicModel[], render: (t: TopicModel) => string): string {
  if (topics.length === 0) return "";
  return `<div class="grouphd">${label}</div>` + topics.map(render).join("");
}

// --- the Continue hero -----------------------------------------------------

function hero(lead: TopicModel | undefined): string {
  if (!lead) return "";
  // Name where you actually resume — the authored lesson the Open button and the
  // rail's next bead point to — falling back to the forecast only when none remain.
  const next = nextLessonTitle(lead) ?? lead.nextUp ?? "Continue";
  return `<div class="hero">
    <div class="l">
      <span class="eyebrow">Continue where you left off</span>
      <h2>${esc(lead.title)}</h2>
      <span class="nx">Next: ${esc(next)}</span>
      <span class="meta">${journeyText(lead)} · ${lead.homeworksDone} homeworks · <span class="provisional-tag">provisional</span></span>
    </div>
    <a class="btn" href="${nextHref(lead)}">Open lesson →</a>
  </div>`;
}

// --- rails -----------------------------------------------------------------

function rail(t: TopicModel): string {
  if (t.lessonsAuthored === 0) return railNew(t);
  return `<div class="rail">
    <div class="rhd"><h3>${esc(t.title)}</h3>${chip(t.state)}</div>
    ${railTrack(t)}
    <div class="foot">
      <span class="metric"><b>${t.lessonsCompleted}</b>/${t.lessonsAuthored} lessons</span>
      <span class="metric"><b>${t.homeworksDone}</b> homeworks</span>
      <span>${journeyText(t)} <span class="provisional-tag">provisional</span></span>
    </div>
  </div>`;
}

function railNew(t: TopicModel): string {
  return `<div class="rail newtopic">
    <div class="rhd"><h3>${esc(t.title)}</h3>${chip(t.state)}</div>
    <div class="body">Mission set — no lessons authored yet. The journey is drawn once teaching begins.</div>
  </div>`;
}

function railDone(t: TopicModel): string {
  return `<div class="rail done-topic">
    <div class="rhd">
      <h3>${esc(t.title)} <span class="muted">· ${t.lessonsAuthored} lessons · ${t.homeworksDone} homeworks</span></h3>
      ${chip(t.state)}
    </div>
  </div>`;
}

/**
 * The windowed bead track: authored lessons (from recorded state) followed by
 * dashed ghost beads (planned, not yet authored), with a leading `… N done` cap
 * and a trailing `~N more planned` cap standing in for the hidden head and tail.
 */
function railTrack(t: TopicModel): string {
  const authored = t.lessons.length;
  const total = authored + t.plannedGhosts.length;
  const nextIdx = nextLessonIndex(t);
  const pivot = nextIdx >= 0 ? nextIdx : authored; // first unfinished authored, else first ghost

  const winStart = Math.max(pivot - BEHIND, 0);
  const winEnd = Math.min(pivot + AHEAD, total - 1);

  let nodes = "";
  if (winStart > 0) {
    nodes += `<div class="node cap-node lead"><span class="capend">… ${winStart} done</span></div>`;
  }
  for (let i = winStart; i <= winEnd; i++) {
    nodes += i < authored ? authoredNode(t, i, t.lessons[i]!, i === nextIdx) : ghostNode(t, i - authored);
  }
  const moreAhead = total - 1 - winEnd;
  if (moreAhead > 0) {
    const tilde = t.journey.approximate ? "~" : "";
    nodes += `<div class="node cap-node"><span class="capend">${tilde}${moreAhead} more planned</span></div>`;
  }
  return `<div class="track">${nodes}</div>`;
}

function authoredNode(t: TopicModel, i: number, lesson: LessonBead, isNext: boolean): string {
  const cls = isNext ? "next" : lesson.state === "completed" ? "done" : "";
  const label = lesson.state === "completed" ? "✓" : isNext ? "›" : String(i + 1);
  const href = `/w/${encodeURIComponent(t.slug)}/lessons/${encodeURIComponent(lesson.file)}`;
  return `<div class="node ${cls}"><a href="${href}"><div class="bead">${label}</div><div class="cap">${esc(lesson.title)}</div></a></div>`;
}

function ghostNode(t: TopicModel, ghostIdx: number): string {
  const title = t.plannedGhosts[ghostIdx] ?? "planned";
  return `<div class="node ghost"><div class="bead"></div><div class="cap">${esc(title)}</div></div>`;
}

// --- honest soft-journey text (no %, greyed ~) -----------------------------

function journeyText(t: TopicModel): string {
  const denom = t.journey.plannedTotal;
  if (denom === 0) return `<span class="faint">No lessons yet</span>`;
  const pos = Math.min(t.state === "completed" ? t.journey.completed : t.journey.completed + 1, denom);
  // The "Lesson N of ~M" skeleton lives once, in journeyLabel (shared with the
  // lesson top bar so the two can't drift). Here we only style it: grey the ~
  // and add the "planned" suffix.
  const label = esc(journeyLabel(pos, denom)).replace("~", `<span class="tilde">~</span>`);
  return `<span class="approx">${label} planned</span>`;
}

/** Index of the lesson to resume — the first non-completed authored lesson, or -1. */
function nextLessonIndex(t: TopicModel): number {
  return t.lessons.findIndex((l) => l.state !== "completed");
}

function nextLessonTitle(t: TopicModel): string | null {
  const i = nextLessonIndex(t);
  return i >= 0 ? t.lessons[i]!.title : null;
}

function nextHref(t: TopicModel): string {
  const i = nextLessonIndex(t);
  const next = i >= 0 ? t.lessons[i] : t.lessons[0];
  if (!next) return "#";
  return `/w/${encodeURIComponent(t.slug)}/lessons/${encodeURIComponent(next.file)}`;
}

const STATE_LABEL: Record<LessonBead["state"], string> = {
  completed: "Completed",
  "in-progress": "In progress",
  "not-started": "Not started",
};

function chip(state: LessonBead["state"]): string {
  return `<span class="chip ${state}"><span class="dot"></span>${STATE_LABEL[state]}</span>`;
}

// --- first-run empty state (minimal; #13 replaces with the guided hand-off) --

function emptyState(root: string): string {
  return `<div class="emptyroot">
    <h2>No topics yet</h2>
    <p>iTeacher shows one topic for each <code>teach</code> workspace in your root folder.</p>
    <p class="faint">Your root folder is <code>${esc(root)}</code>.</p>
    <p class="faint">Ask Claude Code to start teaching you something — a new topic appears here automatically.</p>
  </div>`;
}

// --- page shell ------------------------------------------------------------

function page(model: DashboardModel, body: string): string {
  const sub = model.topics.length === 1 ? "1 topic" : `${model.topics.length} topics`;
  const header =
    model.topics.length === 0
      ? ""
      : `<div class="topbar"><h1>My Learning</h1><span class="sub">${sub}</span></div>
    <p class="roothint">Root: <code>${esc(model.root)}</code> · one topic per teach workspace</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iTeacher</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="wrap">
${header}
${body}
</div>
<script>${LIVE_SCRIPT}</script>
</body>
</html>`;
}

/**
 * Live updates (#12): subscribe to the server's SSE stream and, on a change
 * notification, re-fetch this same page and swap the freshly rendered rails in.
 *
 * The swap is deliberately thin — it re-fetches this same server-rendered
 * dashboard (itself derived from the fresh model on every request) and replaces
 * `.wrap`, so the rail-rendering logic lives in exactly one place (this module)
 * instead of being re-implemented in the browser. `EventSource` handles
 * reconnect backoff on its own.
 */
const LIVE_SCRIPT = `(function(){
  if(!window.EventSource)return;
  var pending=false;
  function refresh(){
    if(pending)return;pending=true;
    fetch(location.pathname)
      .then(function(r){return r.text();})
      .then(function(html){
        var doc=new DOMParser().parseFromString(html,'text/html');
        var fresh=doc.querySelector('.wrap'),cur=document.querySelector('.wrap');
        if(fresh&&cur)cur.innerHTML=fresh.innerHTML;
      })
      .catch(function(){})
      .then(function(){pending=false;});
  }
  var es=new EventSource('/api/events');
  es.addEventListener('change',refresh);
})();`;

const PAGE_CSS = `
:root{--bg:#f6f7f9;--surface:#fff;--ink:#1a1d21;--muted:#6b7280;--faint:#9ca3af;
--line:#e5e7eb;--accent:#3b5bdb;--accent-soft:#e7ecff;--done:#2f9e44;--done-soft:#e6f4ea;
--progress:#f08c00;--ghost:#cbd2da;--radius:14px;--shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.1)}
*{box-sizing:border-box}html,body{margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
background:var(--bg);color:var(--ink);line-height:1.45;-webkit-font-smoothing:antialiased}
.wrap{max-width:960px;margin:0 auto;padding:32px 24px 80px}
.topbar{display:flex;align-items:baseline;gap:14px;margin-bottom:4px}
.topbar h1{font-size:22px;margin:0;letter-spacing:-.01em}
.topbar .sub{color:var(--muted);font-size:13px}
.roothint{color:var(--faint);font-size:12px;margin:0 0 26px}
.roothint code,.emptyroot code{background:#eceef1;padding:1px 6px;border-radius:5px;font-size:11px;
font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px}
.chip.completed{background:var(--done-soft);color:var(--done)}
.chip.in-progress{background:#fff4e6;color:var(--progress)}
.chip.not-started{background:#f1f3f5;color:var(--muted)}
.chip .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.approx .tilde{color:var(--faint)}
.provisional-tag{font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.metric b{font-weight:650}
.muted{color:var(--muted);font-weight:400;font-size:13px}.faint{color:var(--faint)}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;
border-radius:10px;padding:12px 20px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}
.hero{background:linear-gradient(180deg,#fff,#fbfcfe);border:1px solid var(--line);border-left:4px solid var(--accent);
border-radius:var(--radius);box-shadow:var(--shadow);padding:20px 24px;margin-bottom:26px;display:flex;
justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.hero .l{display:flex;flex-direction:column;gap:5px;min-width:260px}
.hero .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-weight:700}
.hero h2{margin:0;font-size:19px}.hero .nx{font-size:14.5px;font-weight:600}.hero .meta{font-size:12.5px;color:var(--muted)}
.grouphd{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--faint);font-weight:700;
margin:22px 0 10px;display:flex;align-items:center;gap:10px}
.grouphd::after{content:"";flex:1;height:1px;background:var(--line)}
.rail{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);
padding:16px 20px;margin-bottom:14px}
.rail.done-topic{background:#fbfcfd;padding:12px 20px}
.rail .rhd{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.rail.done-topic .rhd{margin-bottom:0}.rail h3{margin:0;font-size:15.5px}
.rail.done-topic h3{font-weight:600}
.track{display:flex;align-items:flex-start;gap:0}
.node{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:88px;position:relative;flex:0 0 auto}
.node>a{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;color:inherit;z-index:1}
.node::after{content:"";position:absolute;top:11px;left:50%;width:100%;height:2px;background:var(--line);z-index:0}
.node:last-child::after{display:none}.node.done::after{background:var(--done)}
.node .bead{width:24px;height:24px;border-radius:50%;background:var(--surface);border:2px solid var(--line);
z-index:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--faint)}
.node.done .bead{background:var(--done);border-color:var(--done);color:#fff}
.node.next .bead{border-color:var(--accent);color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
.node.ghost .bead{border-style:dashed;border-color:var(--ghost);opacity:.75}
.node .cap{font-size:11px;text-align:center;color:var(--muted);max-width:84px;line-height:1.3}
.node.next .cap{color:var(--ink);font-weight:600}.node.ghost .cap{color:var(--ghost)}
.cap-node{min-width:auto;justify-content:center;padding-top:2px}
.cap-node .capend{font-size:11px;color:var(--faint);white-space:nowrap;padding:5px 10px;
border:1px dashed var(--line);border-radius:999px}
.cap-node.lead .capend{border-style:solid;border-color:var(--done-soft);color:var(--done)}
.rail .foot{margin-top:12px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.rail.newtopic{border-style:dashed;box-shadow:none}.rail.newtopic .body{font-size:12.5px;color:var(--muted)}
.emptyroot{max-width:520px;margin:8vh auto;text-align:center;background:var(--surface);border:1px dashed var(--line);
border-radius:var(--radius);padding:40px 32px}
.emptyroot h2{margin:0 0 10px;font-size:18px}.emptyroot p{color:var(--muted);font-size:13.5px;margin:0 0 6px}
`;
