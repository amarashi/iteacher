/**
 * In-app teaching agent host (the phase-2 "agent host" — demo).
 *
 * iTeacher v1 delegated authoring to Claude Code in a terminal. This hosts that
 * conversation *inside the app*: it drives the installed `claude` CLI in headless
 * streaming mode (`--output-format stream-json`), so the teaching agent's Q&A and
 * its file-authoring both happen behind the web UI, with no terminal.
 *
 * Why the CLI and not the Agent SDK: the CLI reuses the user's existing Claude
 * Code **login** (no `ANTHROPIC_API_KEY`, no extra dependency, no separate
 * billing) — which is the whole point of a "you already have Claude Code" demo.
 *
 * One turn = one `claude -p` invocation that streams events and exits. Multi-turn
 * continuity is the session id: we mint it up front (`--session-id`) and resume it
 * on every later turn (`--resume`). The prompt is fed on **stdin**, so a user reply
 * can contain anything (quotes, newlines) without shell-quoting hazards.
 *
 * Each teaching session owns a workspace subfolder under the root; the agent writes
 * `MISSION.md` + `lessons/*.html` there, and the dashboard's own `fs.watch` (#12)
 * reveals the topic live — this module never touches the dashboard.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/** A streamed event from a teaching turn, forwarded to the browser over SSE. */
export type TeachEvent =
  | { type: "ready"; sessionId: string; slug: string }
  | { type: "text"; text: string } // assistant prose, token by token
  | { type: "tool"; name: string } // the agent used a tool (→ "authoring…" hint)
  | { type: "turn" } // turn complete — the agent is waiting for the user
  | { type: "error"; message: string };

type Listener = (e: TeachEvent) => void;

interface Session {
  id: string; // our uuid, also the claude --session-id
  slug: string;
  dir: string;
  listeners: Set<Listener>;
  busy: boolean; // a turn is currently streaming
  history: TeachEvent[]; // replayed to a listener that attaches mid-stream
}

// A native `claude.exe` on Windows — spawn it directly (no shell), so stdin pipes
// cleanly and args aren't concatenated through cmd.exe.
const CLAUDE_BIN =
  process.env.ITEACHER_CLAUDE_BIN || (process.platform === "win32" ? "claude.exe" : "claude");
const TEACH_MODEL = process.env.ITEACHER_TEACH_MODEL || "claude-sonnet-5";
// The teaching agent authors files and invokes the teach skill; it does not need
// shell or the web for a snappy demo. `acceptEdits` auto-approves Write/Edit.
const ALLOWED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "Skill"];

const sessions = new Map<string, Session>();

/** Free-text topic → filesystem-safe slug. */
function slugify(topic: string): string {
  const base = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "topic";
}

/** A slug not already taken under `root` (append -2, -3, … on collision). */
function uniqueSlug(root: string, topic: string): string {
  const base = slugify(topic);
  let slug = base;
  let n = 2;
  while (existsSync(join(root, slug))) slug = `${base}-${n++}`;
  return slug;
}

/** Begin a teaching session: mint an id, make its workspace folder, run turn one. */
export function startSession(root: string, topic: string): { sessionId: string; slug: string } {
  const id = randomUUID();
  const slug = uniqueSlug(root, topic);
  const dir = join(root, slug);
  mkdirSync(dir, { recursive: true });

  const session: Session = { id, slug, dir, listeners: new Set(), busy: false, history: [] };
  sessions.set(id, session);

  runTurn(session, startPrompt(topic), false);
  return { sessionId: id, slug };
}

/** Send the user's reply into an existing session and stream the agent's next turn. */
export function replyToSession(sessionId: string, text: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.busy) return false;
  runTurn(session, text, true);
  return true;
}

/** Subscribe to a session's events; replays what already streamed this turn. */
export function subscribe(sessionId: string, listener: Listener): (() => void) | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  for (const e of session.history) listener(e);
  session.listeners.add(listener);
  return () => session.listeners.delete(listener);
}

function emit(session: Session, event: TeachEvent): void {
  session.history.push(event);
  for (const l of session.listeners) l(event);
}

/** Run one `claude` turn (start or resume) and stream its events to subscribers. */
function runTurn(session: Session, prompt: string, resume: boolean): void {
  session.busy = true;
  session.history = []; // each turn replays only its own output to late subscribers

  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--model",
    TEACH_MODEL,
    "--permission-mode",
    "acceptEdits",
    "--allowed-tools",
    ...ALLOWED_TOOLS,
    resume ? "--resume" : "--session-id",
    session.id,
  ];

  const child = spawn(CLAUDE_BIN, args, { cwd: session.dir });

  // Prompt over stdin so a user reply with quotes/newlines never needs escaping.
  child.stdin.write(prompt);
  child.stdin.end();

  emit(session, { type: "ready", sessionId: session.id, slug: session.slug });

  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buf += chunk;
    let nl: number;
    // stream-json is newline-delimited; parse whole lines, keep any partial tail.
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) handleLine(session, line);
    }
  });

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (d: string) => (stderr += d));

  child.on("error", (e) => {
    session.busy = false;
    emit(session, { type: "error", message: e.message });
  });
  child.on("close", (code) => {
    session.busy = false;
    // A clean turn ends with a `result` line (→ "turn" already emitted). A non-zero
    // exit with no result is a real failure worth surfacing.
    if (code !== 0 && !endedCleanly(session)) {
      emit(session, { type: "error", message: stderr.slice(-400) || `claude exited ${code}` });
    }
  });
}

/** Did this turn already emit its terminal `turn` event? */
function endedCleanly(session: Session): boolean {
  return session.history.some((e) => e.type === "turn");
}

/** Map one stream-json line to a TeachEvent (or ignore lines we don't surface). */
function handleLine(session: Session, line: string): void {
  let msg: any;
  try {
    msg = JSON.parse(line);
  } catch {
    return; // ignore anything that isn't a JSON event
  }

  if (msg.type === "stream_event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
      emit(session, { type: "text", text: ev.delta.text });
    } else if (ev.type === "content_block_start" && ev.content_block?.type === "tool_use") {
      emit(session, { type: "tool", name: ev.content_block.name });
    }
    return;
  }

  if (msg.type === "result") {
    emit(session, { type: "turn" });
  }
}

/** The opening instruction: interview briefly, then author an iTeacher-shaped workspace. */
function startPrompt(topic: string): string {
  return `I want to learn: ${topic}

You are my teacher, following the iTeacher "teach" method. Treat THIS directory as the teaching workspace. (If a "teach" skill guide is available to you, read its files and follow them; don't announce anything about tools or skills — just teach.)

This is a live, in-app teaching session, so behave conversationally:
- First, greet me warmly in one line and ask me AT MOST one or two short questions to pin down my mission (why I want this / my current level). Then STOP and wait for my reply — do not author anything yet.
- After I answer, author the workspace in this directory:
  1. MISSION.md — start it with the line "# Mission: <a short title>", then follow the teach mission format.
  2. Three short, beautiful, self-contained HTML lessons in ./lessons/ named 0001-*.html, 0002-*.html, 0003-*.html — clean typography, each teaching one tightly-scoped idea, each with one small interactive check.
  3. SYLLABUS.md — a numbered markdown list, one line per lesson in teaching order, in exactly this shape:
       1. **Title** — one-line gist. [authored: 0001-....html]
       2. **Title** — one-line gist. [authored: 0002-....html]
       3. **Title** — one-line gist. [authored: 0003-....html]
       4. **Title** — one-line gist. [planned]
       5. **Title** — one-line gist. [planned]
- Keep it snappy for a live demo: rely on your own knowledge, do NOT browse the web, do NOT run shell commands, do NOT open a browser.
- Speak in a warm, concise, encouraging voice throughout.`;
}
