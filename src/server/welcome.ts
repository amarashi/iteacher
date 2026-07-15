/**
 * The first-run welcome screen (issue #10) — show + confirm, default-accept.
 *
 * Named after the settled decision in `prototypes/first-run.html`: on the very
 * first launch (no persisted root) iTeacher names the **resolved absolute path**
 * it proposes — copyable, because Claude Code must reach the same folder from a
 * terminal (#3) — surfaces sync-folder detection as a subtitle, and offers one
 * primary that accepts the default plus a quiet "choose a different folder".
 *
 * Confirming POSTs to `/api/root`; the server creates + persists the root and the
 * next load is the dashboard. This module only renders — no state, no fs.
 */

import { esc, attr } from "./html.js";
import { TOKENS_CSS } from "./tokens.js";

export interface WelcomeModel {
  /** The resolved absolute path proposed as the root. */
  defaultRoot: string;
  /** Sync-folder label (e.g. "iCloud Drive"), or null if none was detected. */
  syncFolder: string | null;
}

export function renderWelcome(model: WelcomeModel): string {
  const detected = model.syncFolder
    ? `<p class="detected">Placed inside your <b>${esc(model.syncFolder)}</b> so it backs up and syncs automatically.</p>`
    : `<p class="detected">In your home folder.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Welcome to iTeacher</title>
<style>${WELCOME_CSS}</style>
</head>
<body>
<div class="card">
  <p class="brand">Welcome to iTeacher</p>
  <h2>Where your learning lives</h2>
  <p>iTeacher keeps one folder for everything it teaches you. You can point Claude Code
     at this same folder from a terminal, so it stays a real, visible folder — never hidden away.</p>

  <div class="pathrow">
    <div class="pathfield" id="path">${esc(model.defaultRoot)}</div>
    <button class="copy" type="button" data-copy="${attr(model.defaultRoot)}">Copy</button>
  </div>
  ${detected}

  <button class="btn block" type="button" id="start">Start here &rarr;</button>
  <div class="pick">
    <button class="linkbtn" type="button" id="choose">Choose a different folder&hellip;</button>
  </div>

  <div class="chooser" id="chooser" hidden>
    <label for="custom">Enter the absolute path to use:</label>
    <div class="pathrow">
      <input class="pathinput" id="custom" type="text" value="${attr(model.defaultRoot)}"
             autocomplete="off" spellcheck="false">
      <button class="btn" type="button" id="useCustom">Use this folder</button>
    </div>
    <p class="err" id="err" hidden></p>
  </div>
</div>

<script>
(function () {
  var err = document.getElementById('err');
  function show(msg) { err.textContent = msg; err.hidden = false; }

  async function confirmRoot(body) {
    err.hidden = true;
    var res = await fetch('/api/root', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (res.ok) { window.location.assign('/'); return; }
    show("That path can't be used. Enter an absolute folder path with no '..' segments.");
  }

  document.getElementById('start').addEventListener('click', function () { confirmRoot({}); });
  document.getElementById('choose').addEventListener('click', function () {
    var c = document.getElementById('chooser');
    c.hidden = !c.hidden;
    if (!c.hidden) document.getElementById('custom').focus();
  });
  document.getElementById('useCustom').addEventListener('click', function () {
    confirmRoot({ path: document.getElementById('custom').value });
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    var old = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(function () { btn.textContent = old; }, 1200);
  });
})();
</script>
</body>
</html>`;
}

const WELCOME_CSS =
  TOKENS_CSS +
  `
*{box-sizing:border-box}html,body{margin:0}
body{font-family:var(--font-ui);background:var(--bg);color:var(--text-strong);line-height:1.45;-webkit-font-smoothing:antialiased}
.card{max-width:560px;margin:7vh auto;background:var(--surface);border:1px solid var(--border);
border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);padding:36px 36px 32px}
.brand{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);
font-weight:700;margin:0 0 18px}
.card h2{margin:0 0 8px;font-size:20px;letter-spacing:-.01em}
.card>p{color:var(--text-muted);font-size:13.5px;margin:0 0 6px}
.pathrow{display:flex;align-items:stretch;gap:8px;margin:16px 0 4px}
.pathfield{flex:1;display:flex;align-items:center;background:var(--surface-sunken);border:1px solid var(--border);
border-radius:var(--radius-md);padding:11px 14px;font-family:var(--font-mono);
font-size:12.5px;color:var(--text-strong);overflow:auto;white-space:nowrap}
.pathinput{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:11px 14px;
font-family:var(--font-mono);font-size:12.5px;color:var(--text-strong)}
.copy{flex:0 0 auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:0 14px;
font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer}
.copy:active{background:var(--surface-sunken)}
.detected{font-size:12px;color:var(--text-faint);margin:0 0 22px}
.detected b{color:var(--text-muted);font-weight:600}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:var(--accent-contrast);border:1px solid transparent;
border-radius:var(--radius-md);padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;
transition:background var(--dur-fast) var(--ease-out)}
.btn:hover{background:var(--accent-hover)}
.btn.block{width:100%;justify-content:center;padding:12px}
.pick{text-align:center;margin-top:12px}
.linkbtn{background:none;border:none;color:var(--accent);font-size:12.5px;font-weight:600;
cursor:pointer;padding:6px 2px;text-decoration:none}
.chooser{margin-top:18px;padding-top:18px;border-top:1px solid var(--border)}
.chooser label{display:block;font-size:12.5px;color:var(--text-muted);margin-bottom:4px}
.err{color:#c92a2a;font-size:12.5px;margin:8px 0 0}
`;
