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
import { esc, attr, journeyLabel } from "./html.js";

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

// --- guided-lite hand-off empty state (#13, from #7b) ----------------------

/**
 * The empty-root screen is an explicit, *copyable* hand-off to Claude Code — the
 * app spawns nothing (launching a terminal/agent was rejected in #7 as per-OS /
 * PATH-fragile). It names the three moves — open a terminal in the copyable root,
 * run `claude`, paste the copyable starter prompt — and shows a live "watching
 * this folder…" affordance. The moment the first workspace with a `MISSION.md`
 * appears, the SSE channel (#12) re-fetches this page, which is now the dashboard;
 * the live script (below) celebrates that first flip. Reference: `prototypes/first-run.html`.
 */
function emptyState(root: string): string {
  // Single source for the starter prompt: the copied text (`data-copy`) and the
  // shown text must stay byte-identical, so derive the highlighted markup from the
  // same plaintext rather than writing it twice.
  const prompt = "Teach me <your topic>. Use the teach skill.";
  const promptShown = esc(prompt).replace("&lt;your topic&gt;", `<span class="fill">&lt;your topic&gt;</span>`);

  return `<div class="guided">
    <div class="card dashed">
      <p class="brand">No topics yet</p>
      <h2>Ask Claude Code to teach you something</h2>
      <p>iTeacher shows a topic for each lesson-workspace in your folder. Claude Code
         writes them — here's the whole hand-off:</p>
      <ol class="steps">
        <li>
          <div class="lbl">Open a terminal in your iTeacher folder:</div>
          <div class="pathrow">
            <div class="pathfield">${esc(root)}</div>
            <button class="copy" type="button" data-copy="${attr(root)}">Copy path</button>
          </div>
        </li>
        <li>
          <div class="lbl">Run <code>claude</code> to start Claude Code there.</div>
        </li>
        <li>
          <div class="lbl">Tell it what you want to learn — for example:</div>
          <div class="promptbox">
            <div class="pf">${promptShown}</div>
            <button class="copy" type="button" data-copy="${attr(prompt)}">Copy</button>
          </div>
        </li>
      </ol>
      <div class="waiting"><span class="spinner"></span> Watching this folder — your first topic appears here automatically.</div>
    </div>
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
 * Live updates (#12) + first-topic auto-flip (#13).
 *
 * Two client concerns, both thin over the server render:
 *
 *   • Copy buttons — the guided hand-off empty state carries `data-copy` targets
 *     (the absolute root, the starter prompt). One delegated handler writes them
 *     to the clipboard, same as the welcome screen.
 *
 *   • SSE swap + celebration — subscribe to the server's stream and, on a change,
 *     re-fetch this same page and swap the freshly rendered `.wrap` in. The swap
 *     is deliberately thin: the rail-rendering logic lives in exactly one place
 *     (this module) instead of being re-implemented in the browser, and
 *     `EventSource` handles reconnect backoff on its own. When that swap takes us
 *     from the topic-less hand-off (`.guided`) to a real dashboard, we inject a
 *     brief one-time "🎉 Your first topic is here!" banner — the #7c auto-flip.
 */
const LIVE_SCRIPT = `(function(){
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-copy]');if(!b)return;
    var t=b.getAttribute('data-copy');
    if(navigator.clipboard)navigator.clipboard.writeText(t);
    var old=b.textContent;b.textContent='Copied ✓';b.classList.add('done');
    setTimeout(function(){b.textContent=old;b.classList.remove('done');},1200);
  });

  if(!window.EventSource)return;
  function celebrate(wrap){
    var host=wrap.querySelector('.grouphd')||wrap.querySelector('.hero')||wrap.firstElementChild;
    var el=document.createElement('div');
    el.className='celebrate';
    el.innerHTML='<span class="party">🎉</span><div>'+
      '<div class="t">Your first topic is here!</div>'+
      '<div class="s">Claude Code is authoring your first lesson — it\\'ll light up the moment it\\'s ready.</div></div>';
    if(host)wrap.insertBefore(el,host);else wrap.appendChild(el);
    // Brief, then auto-dismiss: fade at 6s, remove after the .celebrate.leaving
    // CSS transition (.5s) has finished. Keep the 6600 gap > that transition.
    setTimeout(function(){el.classList.add('leaving');},6000);
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},6600);
  }
  var pending=false;
  function refresh(){
    if(pending)return;pending=true;
    fetch(location.pathname)
      .then(function(r){return r.text();})
      .then(function(html){
        var doc=new DOMParser().parseFromString(html,'text/html');
        var fresh=doc.querySelector('.wrap'),cur=document.querySelector('.wrap');
        if(!fresh||!cur)return;
        var wasEmpty=!!cur.querySelector('.guided');
        cur.innerHTML=fresh.innerHTML;
        if(wasEmpty&&!cur.querySelector('.guided'))celebrate(cur);
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
.roothint code{background:#eceef1;padding:1px 6px;border-radius:5px;font-size:11px;
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
/* --- guided-lite hand-off empty state (#13) --- */
.card{max-width:560px;margin:6vh auto;background:var(--surface);border:1px solid var(--line);
border-radius:var(--radius);box-shadow:var(--shadow);padding:36px 36px 32px}
.card.dashed{border-style:dashed;box-shadow:none}
.card .brand{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);font-weight:700;margin:0 0 18px}
.card h2{margin:0 0 8px;font-size:20px;letter-spacing:-.01em}
.card>p{color:var(--muted);font-size:13.5px;margin:0 0 6px}
.pathrow{display:flex;align-items:stretch;gap:8px;margin:12px 0 4px}
.pathfield{flex:1;display:flex;align-items:center;background:#f2f4f7;border:1px solid var(--line);border-radius:10px;
padding:11px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;color:var(--ink);
overflow:auto;white-space:nowrap}
.copy{flex:0 0 auto;background:#fff;border:1px solid var(--line);border-radius:10px;padding:0 14px;font-size:12px;
font-weight:600;color:var(--muted);cursor:pointer}
.copy:active{background:#eceef1}.copy.done{color:var(--done);border-color:var(--done-soft)}
.steps{list-style:none;margin:20px 0 0;padding:0;counter-reset:s}
.steps>li{position:relative;padding:0 0 20px 40px;counter-increment:s}
.steps>li::before{content:counter(s);position:absolute;left:0;top:-1px;width:26px;height:26px;border-radius:50%;
background:var(--accent-soft);color:var(--accent);font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.steps>li:not(:last-child)::after{content:"";position:absolute;left:13px;top:28px;bottom:6px;width:2px;background:var(--line)}
.steps .lbl{font-size:13.5px;margin:2px 0 8px}
.steps .lbl code{background:#eceef1;padding:2px 8px;border-radius:6px;font-size:12px;
font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.promptbox{display:flex;align-items:flex-start;gap:8px}
.promptbox .pf{flex:1;background:#f2f4f7;border:1px solid var(--line);border-radius:10px;padding:11px 14px;
font-size:13px;color:var(--ink);line-height:1.5}
.promptbox .pf .fill{color:var(--accent);font-weight:600}
.waiting{display:flex;align-items:center;gap:10px;margin:26px 0 0;padding-top:20px;border-top:1px solid var(--line);
font-size:12.5px;color:var(--muted)}
.spinner{width:14px;height:14px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);
animation:spin 900ms linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* --- first-topic celebration (#13, injected on the empty→topics flip) --- */
.celebrate{display:flex;align-items:center;gap:12px;background:linear-gradient(180deg,#fff,#f4f8ff);
border:1px solid var(--accent-soft);border-left:4px solid var(--accent);border-radius:var(--radius);
box-shadow:var(--shadow);padding:16px 20px;margin-bottom:22px;animation:pop .5s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.celebrate.leaving{opacity:0;transform:translateY(-6px);transition:opacity .5s ease,transform .5s ease}
.celebrate .party{font-size:22px}.celebrate .t{font-size:14.5px;font-weight:650}
.celebrate .s{font-size:12.5px;color:var(--muted)}
`;
