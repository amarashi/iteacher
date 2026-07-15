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
    `<button class="iteacher-bar__complete" type="button"${buttonAttrs} ` +
    `onclick="window.iteacher&&window.iteacher.complete&&window.iteacher.complete();` +
    `this.textContent='✓ Completed';this.setAttribute('data-completed','true');this.disabled=true;">` +
    `${buttonLabel}</button>` +
    next +
    `</div>` +
    `<div class="iteacher-bar__spacer"></div>`
  );
}

const BAR_CSS = `
.iteacher-bar{position:fixed;top:0;left:0;right:0;height:44px;display:flex;align-items:center;gap:12px;
padding:0 16px;background:#12141a;color:#e7e9ee;font:14px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;
box-shadow:0 1px 0 rgba(255,255,255,.06);z-index:2147483647;box-sizing:border-box}
.iteacher-bar a,.iteacher-bar button{color:inherit}
.iteacher-bar__back{text-decoration:none;font-weight:600;white-space:nowrap}
.iteacher-bar__back:hover{text-decoration:underline}
.iteacher-bar__meta{display:flex;align-items:center;gap:8px;min-width:0;flex:1;overflow:hidden}
.iteacher-bar__topic{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iteacher-bar__lesson{opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iteacher-bar__sep{opacity:.4}
.iteacher-bar__progress{margin-left:auto;opacity:.6;white-space:nowrap;font-variant-numeric:tabular-nums}
.iteacher-bar__complete{border:1px solid rgba(255,255,255,.18);background:#242833;border-radius:6px;
padding:6px 12px;cursor:pointer;font:inherit;font-weight:600;white-space:nowrap}
.iteacher-bar__complete:hover{background:#2c313e}
.iteacher-bar__complete[data-completed="true"]{background:#1f3a29;border-color:#2f6b46;cursor:default}
.iteacher-bar__complete[disabled]{opacity:1}
.iteacher-bar__next{text-decoration:none;font-weight:600;white-space:nowrap;
border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:6px 12px}
.iteacher-bar__next:hover{background:#242833}
.iteacher-bar__spacer{height:44px}
`;
