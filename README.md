# iTeacher

A local web app that renders a root folder of [`teach`](teach/SKILL.md) workspaces
as a multi-topic learning dashboard and runs their lessons end-to-end — open a
lesson, do its exercises, and have that progress recorded automatically.

This is the first buildable slice of the [iTeacher wayfinder map (#2)](https://github.com/amarashi/iteacher/issues/2):
the **data layer** (#1), the **lesson render surface** (#5), and the **lesson
runtime** (#6), wired into one running vertical.

## Run it

```bash
pnpm install
pnpm dev --root <path-to-your-teach-workspaces>   # defaults to ~/iTeacher
# → http://localhost:4173
```

### Double-click launch (no terminal, #11)

For a non-technical learner, the [`launchers/`](launchers/) folder has a
double-clickable launcher per platform. It builds once if needed, starts the
local server, and opens the system browser at the served URL:

| Platform | File |
| --- | --- |
| Windows | [`launchers/iTeacher.cmd`](launchers/iTeacher.cmd) |
| macOS | [`launchers/iTeacher.command`](launchers/iTeacher.command) (`chmod +x` once) |
| Linux | [`launchers/iteacher.sh`](launchers/iteacher.sh) |

Under the hood the launcher just runs `node dist/server/main.js --open`; `--open`
(or `ITEACHER_OPEN=1`) makes the server open the browser once it is listening.
It reuses the same root resolution + first-run flow — it does not pick the root
itself. Closing the window (or Ctrl-C) shuts the server down gracefully. It stays
a local web app over `localhost`; it is not Electron.

Each immediate subfolder of the root that contains a `MISSION.md` is a topic.
The app is a **viewer / runtime**, not an authoring agent — lessons are authored
by Claude Code running `teach`; iTeacher only reads workspace files and writes
one file back: `progress.json` (the shell decision, #3).

## Architecture

Two layers, one seam between them.

### Data layer — the workspace store (`src/store`, issue #1)

Additive over `teach`: it reads teach's own files and adds only `SYLLABUS.md`
(agent-authored forecast) and `progress.json` (app-managed raw facts), never
touching an existing teach format. Two public operations:

- `deriveDashboard(rootDir) → DashboardModel` — scan the root, derive every
  metric from raw facts. **No metric is stored**, so adding a lesson never
  leaves a stale number.
- `recordCompletion(workspaceDir, event) → void` — append one raw completion
  fact via a **monotonic** apply: lesson state only widens
  (not-started → in-progress → completed) and exercise status only climbs
  (attempted → passed), so duplicate or out-of-order events never regress truth.

`DashboardModel` is the single UI contract; the on-disk formats are internal.

### Render surface + runtime (`src/server`, issues #5 + #6)

An Express app over `localhost`:

- **`GET /w/:topic/<path>`** serves a workspace's files with their on-disk layout
  intact (so teach's relative links resolve). Lesson pages
  (`lessons/*.html`) get a thin **server-injected top bar** and the runtime
  bridge; everything else is served verbatim. No iframe, no defensive sandbox —
  lessons are the learner's own same-origin files (#5).
- **`GET /_iteacher/bridge.js`** is the runtime bridge (`src/server/bridge.ts`).

## The lesson runtime (issue #6)

How a running lesson drives `recordCompletion`:

| Lesson event | Fired by | Becomes |
| --- | --- | --- |
| lesson opened | bridge, once on load | lesson → `in-progress` |
| exercise attempted / passed (+ score) | widget dispatches `iteacher:exercise` bubbling `CustomEvent`, joined to the nearest `data-exercise-id` | exercise fact |
| lesson completed | top-bar **Mark complete** button (`window.iteacher.complete()`) **or** a self-completing lesson's `iteacher:lesson` `{status:"completed"}` event | lesson → `completed` |

- **Transport:** a same-origin POST to `/api/progress`, preferring `navigator.sendBeacon`
  so events survive navigation/unload (falling back to `fetch(keepalive)`).
- **Idempotency & timing:** the bridge holds no state; the server is the source
  of truth and every write goes through the store's monotonic apply. A repeated
  `lesson-opened`, a re-open after completion, or a late `attempted` beacon after
  a `passed` all no-op safely.
- **Graceful degradation:** if a lesson is opened as a bare file (no injected
  `iteacher-lesson` meta), the bridge does nothing — a silent no-op, so lessons
  still work outside the app.

## Develop

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest: store, server, and jsdom bridge tests
pnpm build       # emit dist/
```

Tests are behavioral and drive real temp-directory fixtures through the public
seams (never the internal parsers), so the on-disk formats can evolve without
breaking tests as long as the derived model stays stable.
