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
import { TOKENS_CSS } from "./tokens.js";

const AHEAD = 3; // beads to draw past the next-up lesson before collapsing to a cap
const BEHIND = 1; // recent completed beads to keep for context

/** Count-appropriate noun: `plural("lesson", 1)` → "lesson", `2` → "lessons". Naive +s. */
function plural(word: string, n: number): string {
  return n === 1 ? word : `${word}s`;
}

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
  // A big ghosted lesson numeral as a graphic accent (the lesson you're about to do).
  const numeral = String(lead.lessonsCompleted + 1).padStart(2, "0");
  return `<div class="hero">
    <span class="hero-num" aria-hidden="true">${numeral}</span>
    <div class="hero-body">
      <span class="eyebrow">Continue where you left off</span>
      <h2>${esc(lead.title)}</h2>
      <div class="hero-foot">
        <div class="hero-meta">
          <span class="nx"><span class="nx-lbl">Next</span><b>${esc(next)}</b></span>
          <span class="meta">${journeyText(lead)} · ${lead.homeworksDone} ${plural("homework", lead.homeworksDone)} · <span class="provisional-tag">provisional</span></span>
        </div>
        <a class="btn" href="${nextHref(lead)}">Open lesson <span aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
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
      <span class="metric"><b>${t.homeworksDone}</b> ${plural("homework", t.homeworksDone)}</span>
      <span class="metric">${journeyText(t)} <span class="provisional-tag">provisional</span></span>
      <span class="spacer"></span>
      <a class="ghostbtn" href="${nextHref(t)}">Open next <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>`;
}

function railNew(t: TopicModel): string {
  return `<div class="rail newtopic">
    <div class="rhd"><h3>${esc(t.title)}</h3>${chip(t.state)}</div>
    <div class="ghostbeads"><span></span><span></span><span></span></div>
    <div class="body">Mission set — no lessons authored yet. The journey is drawn once teaching begins.</div>
  </div>`;
}

function railDone(t: TopicModel): string {
  return `<div class="rail done-topic">
    <div class="rhd">
      <h3>${esc(t.title)} <span class="donemeta">· ${t.lessonsAuthored} ${plural("lesson", t.lessonsAuthored)} · ${t.homeworksDone} ${plural("homework", t.homeworksDone)}</span></h3>
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
    <div class="card">
      <p class="brand">Welcome</p>
      <h2>What do you want to learn?</h2>
      <p>Your teacher plans the topic, asks a couple of quick questions, and writes your
         first lessons — right here, no terminal needed.</p>
      <button class="btn block" type="button" onclick="iteacherOpenChat()">✦ Teach me something</button>
      <details class="fallback">
        <summary>Prefer to drive Claude Code from a terminal?</summary>
        <ol class="steps">
          <li>
            <div class="lbl">Open a terminal in your iTeacher folder:</div>
            <div class="pathrow">
              <div class="pathfield">${esc(root)}</div>
              <button class="copy" type="button" data-copy="${attr(root)}">Copy path</button>
            </div>
          </li>
          <li><div class="lbl">Run <code>claude</code> to start Claude Code there.</div></li>
          <li>
            <div class="lbl">Tell it what you want to learn — for example:</div>
            <div class="promptbox">
              <div class="pf">${promptShown}</div>
              <button class="copy" type="button" data-copy="${attr(prompt)}">Copy</button>
            </div>
          </li>
        </ol>
      </details>
      <div class="waiting"><span class="spinner"></span> Your topics appear here automatically.</div>
    </div>
  </div>`;
}

/**
 * The docked teacher chat (phase-2 demo). Lives OUTSIDE `.wrap` so the live-update
 * swap (#12) that repaints the dashboard never wipes an in-flight conversation.
 * All behaviour is in LIVE_SCRIPT; this is just the shell.
 */
function chatPanel(): string {
  return `<div class="scrim" onclick="iteacherCloseChat()"></div>
<aside class="chatpanel" id="chatpanel" aria-hidden="true">
  <div class="chathd">
    <span class="chateyebrow">✦ Your teacher</span>
    <button class="chatx" type="button" onclick="iteacherCloseChat()" aria-label="Close">×</button>
  </div>
  <div class="chatlog" id="chatlog">
    <div class="msg bot"><div class="bubble">Hi! I'm your teacher. <b>What would you like to learn?</b>
<span class="hint">e.g. "the basics of chess" or "how mortgages work"</span></div></div>
  </div>
  <form class="chatform" onsubmit="return iteacherSend(event)">
    <textarea id="chatinput" rows="1" placeholder="Type what you want to learn…" autocomplete="off"></textarea>
    <button class="send" type="submit" aria-label="Send">→</button>
  </form>
</aside>`;
}

// --- page shell ------------------------------------------------------------

function page(model: DashboardModel, body: string): string {
  const sub = model.topics.length === 1 ? "1 topic" : `${model.topics.length} topics`;
  const header =
    model.topics.length === 0
      ? ""
      : `<div class="topbar"><h1>My Learning</h1><span class="sub">${sub}</span>
    <button class="teachbtn" type="button" onclick="iteacherOpenChat()">✦ Teach me something</button></div>
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
${chatPanel()}
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
      '<div class="eb">First topic</div>'+
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

  // --- in-app teacher chat (phase-2 demo) ---
  var sid=null, es2=null, curBubble=null, curTxt=null, curText='', sending=false;
  function log(){ return document.getElementById('chatlog'); }
  function scroll(){ var l=log(); if(l) l.scrollTop=l.scrollHeight; }
  window.iteacherOpenChat=function(){
    document.body.classList.add('chat-open');
    var p=document.getElementById('chatpanel'); if(p) p.setAttribute('aria-hidden','false');
    var i=document.getElementById('chatinput'); if(i) i.focus();
  };
  window.iteacherCloseChat=function(){
    document.body.classList.remove('chat-open');
    var p=document.getElementById('chatpanel'); if(p) p.setAttribute('aria-hidden','true');
  };
  function addUser(text){
    var m=document.createElement('div'); m.className='msg me';
    var b=document.createElement('div'); b.className='bubble'; b.textContent=text;
    m.appendChild(b); log().appendChild(m); scroll();
  }
  function newBot(){
    var m=document.createElement('div'); m.className='msg bot';
    curBubble=document.createElement('div'); curBubble.className='bubble streaming';
    curTxt=document.createElement('span'); curTxt.className='txt';
    curBubble.appendChild(curTxt); m.appendChild(curBubble);
    log().appendChild(m); curText=''; scroll();
  }
  function authoringChip(){
    if(!curBubble||curBubble.querySelector('.authoring'))return;
    var c=document.createElement('div'); c.className='authoring';
    c.innerHTML='<span class="dots"><i></i><i></i><i></i></span> writing your lessons\\u2026';
    curBubble.appendChild(c); scroll();
  }
  function setSending(v){
    sending=v;
    var i=document.getElementById('chatinput'), s=document.querySelector('.send');
    if(i) i.disabled=v; if(s) s.disabled=v; if(!v&&i) i.focus();
  }
  function onTeach(d){
    if(d.type==='text'){ if(!curBubble)newBot(); curText+=d.text; curTxt.textContent=curText; scroll(); }
    else if(d.type==='tool'){ if(d.name==='Write'||d.name==='Edit'){ if(!curBubble)newBot(); authoringChip(); } }
    else if(d.type==='turn'){ if(curBubble){ curBubble.classList.remove('streaming'); var a=curBubble.querySelector('.authoring'); if(a){ a.classList.add('done'); a.innerHTML='\\u2713 lessons ready'; } } curBubble=null; setSending(false); }
    else if(d.type==='error'){ if(!curBubble)newBot(); curTxt.textContent=curText+' \\u26a0 '+d.message; curBubble.classList.remove('streaming'); curBubble=null; setSending(false); }
  }
  function openStream(){
    if(es2)es2.close();
    es2=new EventSource('/api/teach/'+sid+'/events');
    es2.onmessage=function(ev){ var d; try{d=JSON.parse(ev.data);}catch(e){return;} if(d.type==='ready')return; onTeach(d); };
  }
  window.iteacherSend=function(e){
    if(e&&e.preventDefault)e.preventDefault();
    var i=document.getElementById('chatinput'); var text=(i&&i.value||'').trim();
    if(!text||sending)return false;
    addUser(text); if(i)i.value=''; setSending(true);
    if(!sid){
      fetch('/api/teach/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:text})})
        .then(function(r){return r.json();})
        .then(function(j){ sid=j.sessionId; openStream(); })
        .catch(function(){ setSending(false); });
    } else {
      fetch('/api/teach/'+sid+'/reply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text})})
        .catch(function(){ setSending(false); });
    }
    return false;
  };
  document.addEventListener('keydown',function(e){
    if(e.target&&e.target.id==='chatinput'&&e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); window.iteacherSend(e); }
    else if(e.key==='Escape'){ window.iteacherCloseChat(); }
  });
})();`;

const PAGE_CSS =
  TOKENS_CSS +
  `
*{box-sizing:border-box}html,body{margin:0}
body{font-family:var(--font-ui);background:var(--bg);color:var(--text-strong);line-height:1.45;-webkit-font-smoothing:antialiased}
a{color:var(--link)}a:hover{color:var(--link-hover)}
.wrap{max-width:960px;margin:0 auto;padding:32px 24px 80px}
.topbar{display:flex;align-items:baseline;gap:14px;margin-bottom:4px}
.topbar h1{font-size:22px;margin:0;letter-spacing:-.01em}
.topbar .sub{color:var(--text-muted);font-size:13px}
.roothint{color:var(--text-faint);font-size:12px;margin:0 0 26px}
.roothint code{background:var(--surface-sunken);padding:1px 6px;border-radius:var(--radius-sm);font-size:11px;font-family:var(--font-mono)}
/* status chip — quiet hairline pill, single colored dot (no heavy fill) */
.chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;padding:4px 10px 4px 9px;
border-radius:var(--radius-pill);color:var(--text-muted);background:var(--surface);border:1px solid var(--border)}
.chip .dot{width:6px;height:6px;border-radius:50%;background:var(--status-todo)}
.chip.completed .dot{background:var(--status-done)}
.chip.in-progress .dot{background:var(--status-progress)}
.chip.not-started .dot{background:var(--status-todo)}
.approx .tilde{color:var(--text-faint)}
.provisional-tag{font-family:var(--font-ui);font-size:10.5px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.faint{color:var(--text-faint)}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:var(--accent-contrast);border:1px solid transparent;
border-radius:var(--radius-md);padding:12px 20px;font-size:13.5px;font-weight:600;line-height:1;cursor:pointer;text-decoration:none;
transition:background var(--dur-fast) var(--ease-out)}
.btn:hover{background:var(--accent-hover);color:var(--accent-contrast)}
/* Continue hero — flat editorial surface with a ghosted display numeral */
.hero{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);
box-shadow:var(--shadow-sm);padding:24px 26px 22px;margin-bottom:26px}
.hero-num{position:absolute;top:-22px;right:18px;font-family:var(--font-display);font-weight:700;font-size:150px;line-height:1;
letter-spacing:-.03em;color:var(--accent-soft);pointer-events:none;user-select:none}
.hero-body{position:relative}
.hero .eyebrow{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--accent);font-weight:500}
.hero h2{margin:8px 0 14px;font-family:var(--font-display);font-weight:500;font-size:34px;line-height:1.02;letter-spacing:-.01em}
.hero-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding-top:16px;border-top:1px solid var(--border)}
.hero-meta{display:flex;flex-direction:column;gap:6px;min-width:240px}
.hero .nx{font-size:14.5px;color:var(--text-body)}
.hero .nx-lbl{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-faint);margin-right:8px}
.hero .nx b{font-weight:600;color:var(--text-strong)}
.hero .meta{font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted);letter-spacing:.02em}
.grouphd{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-faint);font-weight:700;
margin:22px 0 10px;display:flex;align-items:center;gap:10px}
.grouphd::after{content:"";flex:1;height:1px;background:var(--border)}
/* topic card / rail — flat, hairline, display title */
.rail{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:14px}
.rail.done-topic{background:var(--surface-sunken);padding:14px 20px}
.rail .rhd{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
.rail.done-topic .rhd{margin-bottom:0}
.rail h3{margin:0;font-family:var(--font-display);font-weight:500;font-size:21px;letter-spacing:-.005em}
.donemeta{font-family:var(--font-mono);color:var(--text-muted);font-weight:400;font-size:11px;letter-spacing:.02em}
.track{display:flex;align-items:flex-start;gap:0}
.node{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:var(--node-min);position:relative;flex:0 0 auto}
.node>a{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;color:inherit;z-index:1}
.node::after{content:"";position:absolute;top:11px;left:50%;width:100%;height:2px;background:var(--border);z-index:0}
.node:last-child::after{display:none}.node.done::after{background:var(--status-done)}
.node .bead{width:var(--bead-size);height:var(--bead-size);border-radius:50%;background:var(--surface);border:2px solid var(--border);
z-index:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-faint)}
.node.done .bead{background:var(--status-done);border-color:var(--status-done);color:#fff}
.node.next .bead{border-color:var(--accent);color:var(--accent);box-shadow:var(--shadow-glow)}
.node.ghost .bead{border-style:dashed;border-color:var(--ghost);opacity:.75}
.node .cap{font-size:11px;text-align:center;color:var(--text-muted);max-width:84px;line-height:1.3}
.node.next .cap{color:var(--text-strong);font-weight:600}.node.ghost .cap{color:var(--ghost)}
.cap-node{min-width:auto;justify-content:center;padding-top:2px}
.cap-node .capend{font-size:11px;color:var(--text-faint);white-space:nowrap;padding:5px 10px;
border:1px dashed var(--border);border-radius:var(--radius-pill)}
.cap-node.lead .capend{border-style:solid;border-color:var(--status-done-soft);color:var(--status-done)}
.rail .foot{margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:18px;align-items:center;flex-wrap:wrap;
font-family:var(--font-mono);font-size:11px;letter-spacing:.02em;color:var(--text-muted);font-variant-numeric:tabular-nums}
.rail .foot .metric b{font-weight:700;color:var(--text-strong)}
.rail .foot .spacer{flex:1}
.ghostbtn{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--accent);border:1px solid var(--accent-soft);
border-radius:var(--radius-md);padding:7px 12px;font-family:var(--font-ui);font-size:12.5px;font-weight:600;text-decoration:none;white-space:nowrap;
transition:background var(--dur-fast) var(--ease-out)}
.ghostbtn:hover{background:var(--accent-soft);color:var(--accent)}
.rail.newtopic{border-style:dashed}
.ghostbeads{display:flex;gap:26px;margin-bottom:12px}
.ghostbeads span{width:var(--bead-size);height:var(--bead-size);border-radius:50%;background:var(--surface);border:2px dashed var(--ghost);opacity:.8}
.rail.newtopic .body{font-size:12.5px;color:var(--text-muted)}
/* --- guided-lite hand-off empty state (#13) --- */
.card{max-width:560px;margin:6vh auto;background:var(--surface);border:1px solid var(--border);
border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);padding:36px 36px 32px}
.card.dashed{border-style:dashed;box-shadow:none}
.card .brand{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);font-weight:700;margin:0 0 18px}
.card h2{margin:0 0 8px;font-size:20px;letter-spacing:-.01em}
.card>p{color:var(--text-muted);font-size:13.5px;margin:0 0 6px}
.pathrow{display:flex;align-items:stretch;gap:8px;margin:12px 0 4px}
.pathfield{flex:1;display:flex;align-items:center;background:var(--surface-sunken);border:1px solid var(--border);border-radius:var(--radius-md);
padding:11px 14px;font-family:var(--font-mono);font-size:12.5px;color:var(--text-strong);overflow:auto;white-space:nowrap}
.copy{flex:0 0 auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:0 14px;font-size:12px;
font-weight:600;color:var(--text-muted);cursor:pointer}
.copy:active{background:var(--surface-sunken)}.copy.done{color:var(--status-done);border-color:var(--status-done-soft)}
.steps{list-style:none;margin:20px 0 0;padding:0;counter-reset:s}
.steps>li{position:relative;padding:0 0 20px 40px;counter-increment:s}
.steps>li::before{content:counter(s);position:absolute;left:0;top:-1px;width:26px;height:26px;border-radius:50%;
background:var(--accent-soft);color:var(--accent);font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.steps>li:not(:last-child)::after{content:"";position:absolute;left:13px;top:28px;bottom:6px;width:2px;background:var(--border)}
.steps .lbl{font-size:13.5px;margin:2px 0 8px;color:var(--text-body)}
.steps .lbl code{background:var(--surface-sunken);padding:2px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:var(--font-mono)}
.promptbox{display:flex;align-items:flex-start;gap:8px}
.promptbox .pf{flex:1;background:var(--surface-sunken);border:1px solid var(--border);border-radius:var(--radius-md);padding:11px 14px;
font-family:var(--font-mono);font-size:12.5px;color:var(--text-strong);line-height:1.5}
.promptbox .pf .fill{color:var(--accent);font-weight:600}
.waiting{display:flex;align-items:center;gap:10px;margin:26px 0 0;padding-top:20px;border-top:1px solid var(--border);
font-size:12.5px;color:var(--text-muted)}
.spinner{width:14px;height:14px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--accent);
animation:spin 900ms linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* --- first-topic celebration (#13, injected on the empty→topics flip) --- */
.celebrate{display:flex;align-items:center;gap:14px;background:var(--surface);
border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);
padding:16px 20px;margin-bottom:22px;animation:pop .5s var(--ease-pop) both}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.celebrate.leaving{opacity:0;transform:translateY(-6px);transition:opacity .5s ease,transform .5s ease}
.celebrate .party{font-size:22px}
.celebrate .eb{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);font-weight:500;margin-bottom:3px}
.celebrate .t{font-size:14.5px;font-weight:650}
.celebrate .s{font-size:12.5px;color:var(--text-muted)}
/* --- in-app teacher chat (phase-2 demo) --- */
.topbar .teachbtn{margin-left:auto;background:var(--accent);color:var(--accent-contrast);border:none;
border-radius:var(--radius-md);padding:9px 15px;font-family:var(--font-ui);font-size:13px;font-weight:600;
cursor:pointer;box-shadow:var(--shadow-sm);transition:background var(--dur-fast) var(--ease-out)}
.topbar .teachbtn:hover{background:var(--accent-hover)}
.btn.block{width:100%;justify-content:center;padding:13px;font-size:14.5px;margin:20px 0 6px}
.fallback{margin-top:4px}
.fallback>summary{cursor:pointer;color:var(--text-muted);font-size:12.5px;padding:8px 0;list-style:none}
.fallback>summary::-webkit-details-marker{display:none}
.fallback>summary:before{content:"› ";color:var(--text-faint)}
.fallback[open]>summary:before{content:"⌄ "}
.scrim{position:fixed;inset:0;background:rgba(16,24,40,.28);opacity:0;pointer-events:none;
transition:opacity var(--dur-base) var(--ease-out);z-index:40}
body.chat-open .scrim{opacity:1;pointer-events:auto}
/* On desktop the panel is docked, not modal — the scrim must not block the live dashboard. */
@media(min-width:900px){body.chat-open .scrim{background:transparent;pointer-events:none}}
.chatpanel{position:fixed;top:0;left:0;width:min(420px,92vw);height:100vh;background:var(--surface);
border-right:1px solid var(--border);box-shadow:var(--shadow-md);display:flex;flex-direction:column;
transform:translateX(-100%);transition:transform var(--dur-base) var(--ease-out);z-index:50}
body.chat-open .chatpanel{transform:none}
.wrap{transition:margin-left var(--dur-base) var(--ease-out)}
@media(min-width:900px){body.chat-open .wrap{margin-left:min(420px,92vw)}}
.chathd{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--border)}
.chateyebrow{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-weight:600}
.chatx{background:none;border:none;font-size:22px;line-height:1;color:var(--text-faint);cursor:pointer;padding:0 4px}
.chatlog{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
.msg{display:flex}.msg.me{justify-content:flex-end}
.bubble{max-width:82%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;
white-space:pre-wrap;overflow-wrap:anywhere}
.msg.bot .bubble{background:var(--surface-sunken);color:var(--text-strong);border-bottom-left-radius:4px}
.msg.me .bubble{background:var(--accent);color:var(--accent-contrast);border-bottom-right-radius:4px}
.bubble .hint{display:block;margin-top:4px;color:var(--text-faint);font-size:12px}
.bubble.streaming .txt:after{content:"▋";margin-left:1px;color:var(--accent);animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:0}}
.authoring{display:flex;align-items:center;gap:8px;margin-top:9px;padding-top:9px;border-top:1px solid var(--border);
font-size:12px;color:var(--accent);font-weight:600}
.authoring.done{color:var(--status-done)}
.dots{display:inline-flex;gap:3px}
.dots i{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pulse 1s infinite}
.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
@keyframes pulse{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.chatform{display:flex;gap:8px;padding:14px;border-top:1px solid var(--border);align-items:flex-end}
.chatform textarea{flex:1;resize:none;max-height:120px;border:1px solid var(--border);border-radius:12px;
padding:10px 12px;font-family:var(--font-ui);font-size:13.5px;line-height:1.4;color:var(--text-strong);background:var(--surface)}
.chatform textarea:focus{outline:none;border-color:var(--accent);box-shadow:var(--shadow-glow)}
.send{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:none;background:var(--accent);
color:var(--accent-contrast);font-size:18px;cursor:pointer}
.send:disabled{opacity:.45;cursor:default}
`;
