# Artifacts and Exhibits are files in the workspace, perceived via the Read tool

## Context

The critique loop needs the learner's work to reach the tutor's eyes. The tutor is
a headless `claude` agent already running inside the topic's folder with the `Read`
tool, and Claude Code's `Read` can open image files and actually see them, not just
text. The obvious alternative — passing image/file bytes through the chat as
multimodal message content — would mean teaching the CLI bridge to carry
attachments (base64, MIME, streaming), duplicating a capability `Read` already gives us.

## Decision

An **Artifact** (own work, from a lesson) and an **Exhibit** (external material,
from the chat) are both just **files written into the workspace** — under
`./submissions/` and `./exhibits/` respectively. Submitting is a normal tutor turn
that names the file's path; the tutor `Read`s it and responds. The app gains exactly
one new capability: a browser→workspace **save endpoint**. No multimodal chat
transport, no vision-API wiring.

## Consequences

- The runtime now performs a **second category of write** into a workspace —
  learner uploads — alongside `progress.json`, which had been the server's only
  write. Uploads are learner *data*, gitignored, and never authored by the `teach`
  agent (like `progress.json`).
- `./submissions/` and `./exhibits/` are invisible to the dashboard scan (topics
  need `MISSION.md`; lessons come only from `lessons/*.html`), so no scan change.
- Production environments (a canvas, a Pyodide REPL, a Web-MIDI widget) are
  authored *inside lessons* as HTML — they are content, not platform. The app hosts
  none of them.
- Bounded by the tutor's perceptual reach: v1 artifacts are text, code, and images;
  audio/performance is out until the tutor can hear.
