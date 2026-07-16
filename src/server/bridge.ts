/**
 * The lesson runtime bridge (issue #6) — the client-side glue served to every
 * lesson page and injected by {@link import("./render.js").injectChrome}.
 *
 * It turns lesson lifecycle events into `recordCompletion` calls without the
 * lesson author writing any wiring:
 *
 *   - **lesson opened → in-progress** — fired once on load.
 *   - **exercise attempted / passed (+ score)** — from the `iteacher:exercise`
 *     bubbling CustomEvent (issue #5), joined to the nearest `[data-exercise-id]`.
 *   - **lesson completed → completed** — from the injected top-bar button
 *     (`window.iteacher.complete()`) or a self-completing lesson dispatching
 *     `iteacher:lesson` with `{ status: "completed" }`.
 *   - **artifact submitted for critique** — a practice lesson calls
 *     `window.iteacher.submit({ file, brief })` (or dispatches `iteacher:submit`);
 *     the bridge uploads the file to the workspace and relays the saved path +
 *     brief to the study shell, which asks the tutor to critique it (ADR-0002).
 *     This is *not* a progress event — critique is conversational (ADR-0001).
 *
 * Transport is a same-origin POST to `/api/progress`, preferring `sendBeacon`
 * so events survive navigation/unload. Idempotency and ordering are the
 * server's job: every write goes through the store's monotonic apply, so a
 * duplicate `lesson-opened` or a late `attempted` after a `passed` never
 * regresses recorded state — the bridge itself keeps no state.
 *
 * If the page carries no `iteacher-lesson` meta (i.e. it was opened as a bare
 * file, not served by iTeacher), the bridge does nothing — a silent no-op, so
 * lessons degrade gracefully outside the app (the #5 decision).
 *
 * Written as framework-free ES5-compatible source so it runs verbatim in the
 * learner's browser with no build step.
 */
export const BRIDGE_SOURCE = `(function () {
  "use strict";
  var meta = document.querySelector('meta[name="iteacher-lesson"]');
  if (!meta) return;
  var topic = meta.getAttribute("data-topic");
  var lesson = meta.getAttribute("data-lesson");
  if (!topic || !lesson) return;

  function send(event) {
    event.topic = topic;
    event.lesson = lesson;
    var payload = JSON.stringify(event);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([payload], { type: "application/json" }));
        return;
      }
    } catch (e) {}
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(function () {});
  }

  send({ type: "lesson-opened" });

  document.addEventListener("iteacher:exercise", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-exercise-id]") : null;
    if (!el) return;
    var detail = e.detail || {};
    var event = {
      type: "exercise",
      exerciseId: el.getAttribute("data-exercise-id"),
      status: detail.status === "passed" ? "passed" : "attempted"
    };
    if (typeof detail.score === "number") event.score = detail.score;
    send(event);
  });

  document.addEventListener("iteacher:lesson", function (e) {
    if (e.detail && e.detail.status === "completed") send({ type: "lesson-completed" });
  });

  // --- Artifact submission (the Critique Loop) -----------------------------
  // Upload one learner file into the workspace, then tell the study shell (our
  // parent frame) where it landed so it can ask the tutor to critique it. No
  // progress is recorded here — the critique is a conversation, not a grade.
  function upload(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb("could not read the file"); };
    reader.onload = function () {
      var s = String(reader.result || "");
      var comma = s.indexOf(",");
      var b64 = comma >= 0 ? s.slice(comma + 1) : s; // strip the data: URL prefix
      fetch("/api/w/" + encodeURIComponent(topic) + "/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "submission", filename: file.name || "artifact", dataBase64: b64 })
      }).then(function (r) {
        return r.json().then(function (j) { cb(r.ok ? null : (j && j.error) || "upload failed", j && j.path); });
      }).catch(function () { cb("upload failed"); });
    };
    reader.readAsDataURL(file);
  }

  function relay(path, brief) {
    try {
      window.parent.postMessage(
        { source: "iteacher", type: "submitted", path: path, brief: brief || "", lesson: lesson },
        window.location.origin
      );
    } catch (e) {}
  }

  function submit(opts) {
    opts = opts || {};
    var file = opts.file;
    if (!file) return;
    var brief = opts.brief || "";
    upload(file, function (err, path) {
      if (err || !path) {
        document.dispatchEvent(new CustomEvent("iteacher:submit-error", { detail: { message: err } }));
        return;
      }
      document.dispatchEvent(new CustomEvent("iteacher:submit-done", { detail: { path: path } }));
      relay(path, brief);
    });
  }

  // Declarative path: dispatch a bubbling iteacher:submit with { file, brief } in
  // detail; brief falls back to the nearest [data-brief] ancestor's attribute.
  document.addEventListener("iteacher:submit", function (e) {
    var detail = e.detail || {};
    var brief = detail.brief;
    if (!brief && e.target && e.target.closest) {
      var el = e.target.closest("[data-brief]");
      if (el) brief = el.getAttribute("data-brief");
    }
    submit({ file: detail.file, brief: brief });
  });

  window.iteacher = window.iteacher || {};
  window.iteacher.complete = function () { send({ type: "lesson-completed" }); };
  window.iteacher.submit = submit;
})();
`;
