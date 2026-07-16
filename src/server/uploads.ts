/**
 * Learner uploads — the one new category of write the runtime performs into a
 * workspace, alongside `progress.json` (see ADR-0002).
 *
 * The Critique Loop needs the learner's work to reach the tutor's eyes. The tutor
 * is an agent already running inside the topic's folder with the `Read` tool, and
 * Claude Code's `Read` can *see* images, not just text — so an uploaded file on
 * disk is all it takes. This module is the browser→workspace bridge: it decodes a
 * base64 payload, guards the filename and type, and writes it under the workspace.
 *
 * Two kinds, mirroring the two intents (CONTEXT.md):
 *   - **submission** — an Artifact (the learner's own work, from a lesson) → `submissions/`
 *   - **exhibit**    — an Exhibit (external material to ask about, from the chat) → `exhibits/`
 *
 * The returned path is workspace-relative (e.g. `submissions/03-cube.png`), which
 * is exactly what the tutor — whose cwd *is* the workspace — can hand to `Read`.
 *
 * Bounded by the tutor's perceptual reach: only text/code and image types are
 * accepted. Audio and opaque binaries are refused — the tutor can't perceive them.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type UploadKind = "submission" | "exhibit";

/** A validated request to persist one learner file. */
export interface UploadRequest {
  kind: UploadKind;
  /** The learner-supplied name — used only to derive a safe extension + stem. */
  filename: string;
  /** Base64-encoded file bytes (no `data:` prefix). */
  dataBase64: string;
}

export interface UploadResult {
  /** Workspace-relative path, forward-slashed — what the tutor `Read`s. */
  path: string;
}

/** Max decoded size. Base64 in a ~12mb JSON body ⇒ ~9mb of file; images sit well under. */
export const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;

/**
 * The only extensions we accept — the tutor's perceptual reach made concrete.
 * Images it can see; text/code it can read. Deliberately *no* audio/video/binary.
 */
const ALLOWED_EXT = new Set([
  // images the tutor can see
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp",
  // text & code the tutor can read
  "txt", "md", "markdown", "py", "js", "ts", "jsx", "tsx", "json", "csv", "tsv",
  "html", "htm", "css", "yml", "yaml", "toml", "xml", "sql", "sh", "rb", "go",
  "rs", "java", "c", "h", "cpp", "cs", "php", "swift", "kt", "r", "jl", "lua",
]);

const SUBDIR: Record<UploadKind, string> = {
  submission: "submissions",
  exhibit: "exhibits",
};

/**
 * Validate a raw request body into an {@link UploadRequest}, or return a reason
 * string on rejection (so the route can answer 400 with something useful).
 */
export function parseUpload(body: unknown): UploadRequest | string {
  if (!body || typeof body !== "object") return "expected a JSON object";
  const b = body as Record<string, unknown>;

  const kind = b.kind;
  if (kind !== "submission" && kind !== "exhibit") return "kind must be 'submission' or 'exhibit'";

  const filename = b.filename;
  if (typeof filename !== "string" || filename.trim() === "") return "filename is required";
  if (filename.length > 200) return "filename too long";

  const ext = extensionOf(filename);
  if (!ext) return "a file extension is required";
  if (!ALLOWED_EXT.has(ext)) return `unsupported file type: .${ext}`;

  const dataBase64 = b.dataBase64;
  if (typeof dataBase64 !== "string" || dataBase64 === "") return "dataBase64 is required";

  return { kind, filename, dataBase64 };
}

/**
 * Persist a validated upload under `workspaceDir/{submissions|exhibits}/`, choosing
 * a collision-free, path-safe stored name. Throws on oversize or undecodable data.
 */
export function saveUpload(workspaceDir: string, req: UploadRequest, now: Date): UploadResult {
  const bytes = Buffer.from(req.dataBase64, "base64");
  if (bytes.length === 0) return fail("empty or invalid base64 payload");
  if (bytes.length > MAX_UPLOAD_BYTES) return fail("file too large");

  const dir = join(workspaceDir, SUBDIR[req.kind]);
  mkdirSync(dir, { recursive: true });

  const name = storedName(req.filename, now);
  writeFileSync(join(dir, name), bytes);
  return { path: `${SUBDIR[req.kind]}/${name}` };
}

// --- internals -------------------------------------------------------------

function fail(message: string): never {
  throw new Error(message);
}

/** Lowercased final extension (letters/digits only), or "" if none. */
function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  const ext = base.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]+$/.test(ext) ? ext : "";
}

/**
 * A safe, unique stored name: a sanitised stem from the learner's filename, a
 * timestamp for ordering + uniqueness, and the validated extension. The stem is
 * decorative (traceability); the timestamp+ext carry safety, so no learner input
 * can escape the directory or collide.
 */
function storedName(filename: string, now: Date): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const rawStem = dot > 0 ? base.slice(0, dot) : base;
  const ext = extensionOf(filename);
  const stem =
    rawStem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "file";
  const stamp = now.toISOString().replace(/[:.]/g, "-").replace("Z", "");
  return `${stem}-${stamp}.${ext}`;
}
