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

  window.iteacher = window.iteacher || {};
  window.iteacher.complete = function () { send({ type: "lesson-completed" }); };
})();
`;
