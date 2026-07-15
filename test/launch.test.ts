import { describe, it, expect, vi } from "vitest";
import { browserOpenCommand, openBrowser } from "../src/server/launch.js";

describe("browserOpenCommand (#11 launcher)", () => {
  const url = "http://localhost:4173";

  it("opens via `cmd /c start` on Windows, with an empty title arg", () => {
    // The empty "" is start's window-title slot — without it start treats the
    // URL as the title and opens a blank console instead of the browser.
    expect(browserOpenCommand(url, "win32")).toEqual({
      command: "cmd",
      args: ["/c", "start", "", url],
    });
  });

  it("opens via `open` on macOS", () => {
    expect(browserOpenCommand(url, "darwin")).toEqual({ command: "open", args: [url] });
  });

  it("opens via `xdg-open` on Linux / everything else", () => {
    expect(browserOpenCommand(url, "linux")).toEqual({ command: "xdg-open", args: [url] });
    expect(browserOpenCommand(url, "freebsd")).toEqual({ command: "xdg-open", args: [url] });
  });
});

describe("openBrowser (#11 launcher)", () => {
  const url = "http://localhost:4173";

  /** A fake child process capturing the wiring openBrowser performs on it. */
  function fakeChild() {
    return { on: vi.fn(), unref: vi.fn() };
  }

  it("spawns the platform command detached and unref'd so it outlives the server", () => {
    const child = fakeChild();
    const spawnFn = vi.fn(() => child);

    openBrowser(url, "darwin", spawnFn);

    expect(spawnFn).toHaveBeenCalledWith(
      "open",
      [url],
      expect.objectContaining({ detached: true, stdio: "ignore" }),
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it("attaches an `error` listener so an ENOENT opener can't crash the server", () => {
    // spawn reports a missing opener via an async `error` event, not a throw —
    // openBrowser must register a handler or Node escalates it to a crash.
    const child = fakeChild();
    openBrowser(url, "linux", vi.fn(() => child));
    expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
    // The handler itself must be a no-op that doesn't rethrow.
    const handler = child.on.mock.calls[0]![1] as (e: Error) => void;
    expect(() => handler(new Error("spawn xdg-open ENOENT"))).not.toThrow();
  });

  it("never throws if the opener cannot be spawned synchronously", () => {
    const spawnFn = vi.fn(() => {
      throw new Error("ENOENT");
    });
    expect(() => openBrowser(url, "linux", spawnFn)).not.toThrow();
  });
});
