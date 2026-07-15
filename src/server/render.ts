/**
 * Server-side chrome injection for lesson pages (issue #5).
 *
 * Lessons render as their own top-level, same-origin pages (not iframed, no
 * defensive sandbox — they are the learner's own agent-authored files). The
 * app's only chrome is what we inject here: a `meta` tag identifying the
 * topic/lesson to the runtime bridge, the bridge script itself, and a thin
 * top bar (← Dashboard + progress + a Mark-complete control).
 *
 * Injection is tolerant of arbitrary HTML: head content goes before `</head>`
 * when present (else it is prepended), and the bar goes just after the opening
 * `<body>` when present (else prepended). Malformed or fragment HTML still
 * renders — browsers are lenient and the bar/bridge are position-independent.
 */

import { esc, attr } from "./html.js";

export interface ChromeContext {
  topic: string;
  lesson: string;
  /** Topic display title, for the top bar. */
  topicTitle: string;
  /** Lesson display title, for the top bar. */
  lessonTitle: string;
  /** Honest, approximate journey text, e.g. "Lesson 3 of ~12". */
  progressText: string;
  /** Whether this lesson is already recorded completed (drives the button label). */
  completed: boolean;
  /** URL of the next lesson in teaching order, for forward-nav (#5). Null at the end. */
  nextHref: string | null;
}

const BRIDGE_URL = "/_iteacher/bridge.js";

export function injectChrome(html: string, ctx: ChromeContext): string {
  const head = headMarkup(ctx);
  const bar = barMarkup(ctx);

  let out = html;

  // Head content: meta identity + bridge script.
  if (/<\/head\s*>/i.test(out)) {
    out = out.replace(/<\/head\s*>/i, `${head}</head>`);
  } else {
    out = head + out;
  }

  // Top bar: right after the opening <body>, else prepend.
  if (/<body\b[^>]*>/i.test(out)) {
    out = out.replace(/<body\b[^>]*>/i, (m) => `${m}${bar}`);
  } else {
    out = bar + out;
  }

  return out;
}

function headMarkup(ctx: ChromeContext): string {
  return (
    `<meta name="iteacher-lesson" data-topic="${attr(ctx.topic)}" data-lesson="${attr(ctx.lesson)}">` +
    `<script src="${BRIDGE_URL}" defer></script>` +
    `<style>${BAR_CSS}</style>`
  );
}

function barMarkup(ctx: ChromeContext): string {
  const buttonLabel = ctx.completed ? "✓ Completed" : "Mark complete";
  const buttonAttrs = ctx.completed ? ' data-completed="true" disabled' : "";
  const chip = ctx.completed
    ? `<span class="iteacher-bar__chip" data-done="true"><span class="iteacher-bar__dot"></span>Completed</span>`
    : `<span class="iteacher-bar__chip"><span class="iteacher-bar__dot"></span>In progress</span>`;
  const next = ctx.nextHref
    ? `<a class="iteacher-bar__next" href="${attr(ctx.nextHref)}">Next →</a>`
    : "";
  return (
    `<div class="iteacher-bar" role="banner">` +
    `<a class="iteacher-bar__back" href="/">← Dashboard</a>` +
    `<div class="iteacher-bar__meta">` +
    `<span class="iteacher-bar__topic">${esc(ctx.topicTitle)}</span>` +
    `<span class="iteacher-bar__sep">·</span>` +
    `<span class="iteacher-bar__lesson">${esc(ctx.lessonTitle)}</span>` +
    `<span class="iteacher-bar__progress">${esc(ctx.progressText)}</span>` +
    `</div>` +
    chip +
    `<button class="iteacher-bar__complete" type="button"${buttonAttrs} ` +
    `onclick="window.iteacher&&window.iteacher.complete&&window.iteacher.complete();` +
    `this.textContent='✓ Completed';this.setAttribute('data-completed','true');this.disabled=true;">` +
    `${buttonLabel}</button>` +
    next +
    `</div>`
  );
}

/**
 * A light, in-flow sticky bar (design-system product theme), inlined with the few
 * token values it needs — no font @import, so it stays self-contained over the
 * learner's own same-origin lesson HTML. Sticky (not fixed) keeps it in normal
 * flow, so it never overlaps the lesson body and no spacer is required.
 */
const BAR_CSS = `
.iteacher-bar{position:sticky;top:0;z-index:2147483647;display:flex;align-items:center;gap:12px;
padding:9px 16px;background:#fff;border-bottom:1px solid #e5e7eb;color:#1a1d21;
font:13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box}
.iteacher-bar a,.iteacher-bar button{color:inherit;font:inherit}
.iteacher-bar__back{text-decoration:none;font-weight:600;color:#6b7280;white-space:nowrap}
.iteacher-bar__back:hover{color:#0d7af9}
.iteacher-bar__meta{display:flex;align-items:center;gap:8px;min-width:0;flex:1;overflow:hidden}
.iteacher-bar__topic{font-weight:600;color:#1a1d21;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iteacher-bar__lesson{color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iteacher-bar__sep{color:#cbd2da}
.iteacher-bar__progress{margin-left:auto;color:#9ca3af;
font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;
white-space:nowrap;font-variant-numeric:tabular-nums}
.iteacher-bar__chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:#6b7280;
padding:4px 10px 4px 9px;border-radius:999px;background:#fff;border:1px solid #e5e7eb;white-space:nowrap}
.iteacher-bar__dot{width:6px;height:6px;border-radius:50%;background:#f08c00}
.iteacher-bar__chip[data-done] .iteacher-bar__dot{background:#2f9e44}
.iteacher-bar__complete{border:1px solid transparent;background:#0d7af9;color:#fff;border-radius:8px;
padding:7px 14px;cursor:pointer;font-weight:600;white-space:nowrap}
.iteacher-bar__complete:hover{background:#0a5fc4}
.iteacher-bar__complete[data-completed="true"]{background:#2f9e44;cursor:default}
.iteacher-bar__complete[disabled]{opacity:1}
.iteacher-bar__next{text-decoration:none;font-weight:600;color:#0d7af9;white-space:nowrap;
border:1px solid #e4efff;border-radius:8px;padding:7px 12px}
.iteacher-bar__next:hover{background:#e4efff}
`;
